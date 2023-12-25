const express= require("express")
const app =express();
const cors=require('cors')
const User=require('./models/User')
const mongoose=require("mongoose")
const bcrypt = require('bcrypt');
const jwt=require('jsonwebtoken');
const cookieParser=require("cookie-parser")
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const fs=require('fs')
const Post =require('./models/Post')


const salt = bcrypt.genSaltSync(10);
const secret='qwqdwdwonv90voivow90v0wvw9v09vmmPLd';
app.use(cors({
  credentials: true,
  origin: ['https://myblogkarthi.netlify.app', 'http://localhost:3000']
}));

app.use(express.json())
app.use('/uploads',express.static(__dirname+'/uploads'))

app.use(cookieParser());

mongoose.connect('mongodb+srv://karthikeyanskarthikeyans000:BXPCUIZTgk5V5odu@cluster0.z4bvdlv.mongodb.net/?retryWrites=true&w=majority')

try {
  app.post('/register', async (req, res) => {
      const { username, password, phoneNumber } = req.body;

      // Add a check for the minimum length of the username
      if (username.length < 4) {
          return res.status(400).json({ error: 'Username must be at least 4 characters long' });
      }

      const existingUser = await User.findOne({ username });

      if (existingUser) {
          return res.status(400).json({ error: 'Username already taken' });
      }

      const existingUserWithPhoneNumber = await User.findOne({ phoneNumber });

      if (existingUserWithPhoneNumber) {
          return res.status(400).json({ error: 'Phone Number already taken' });
      }

      const data = await User.create({
          username,
          password: bcrypt.hashSync(password, salt),
          phoneNumber
      });

      res.json(data);
  });
} catch (err) {
  res.status(400).json(err.message);
}
try{
    app.post('/login',async(req,res)=>{

        const{username,password}=req.body
        const data=await User.findOne({username})
       
       
        
        if (!data) {
           
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    
        const passok = bcrypt.compareSync(password, data.password);
    
        if (passok) {
            // Password is correct
            jwt.sign({ username, id: data._id }, secret, {}, (err, token) => {
                if (err) throw err;
                res.cookie("token", token).json({
                    id:data._id,
                    username
                 });
            });
            
           
        } else {
            // Password is incorrect
            res.status(401).json({ error: 'Invalid credentials' });
        }

    })

}catch(err){
    console.log(err.message)
}

try{
    app.get('/profile',(req,res)=>{
        const{token}=req.cookies

        jwt.verify(token,secret,{},(err,info)=>{
            if (err) {
                console.error('JWT Verification Error:', err.message);
                return res.status(401).json({ error: 'Unauthorized' });
            }
            res.json(info)
        })
        
    })


}catch(err){
    console.log(err.message)
}

app.post('/logout',(req,res)=>{
    res.cookie('token','').json('ok')
})

app.post('/post',upload.single('files'),async(req,res)=>{
    

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const {originalname,path}=req.file
    const parts=originalname.split('.')
    const ext=parts[parts.length-1]
    const newPath=path+'.'+ext
    fs.renameSync(path,newPath)

    const{token}=req.cookies

    jwt.verify(token,secret,{},async(err,info)=>{
        if (err) {
            console.error('JWT Verification Error:', err.message);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const{title,summary,content}=req.body
   const postDoc= await Post.create({
        title,
        summary,
        content,
        files:newPath,
        author:info.id
        
    })
    res.json(postDoc)
    })
    
    
   
})

app.get('/post',async(req,res)=>{

    res.json(await Post.find().populate('author',['username']).sort({createdAt:-1}).limit(10))
})

app.get('/post/:id',async(req,res)=>{
    const{id}=req.params;
    const postDoc= await Post.findById(id).populate('author',['username'])
    res.json(postDoc)

})

app.put('/post', upload.single('files'), async (req, res) => {
    try {
      let newPath = null;
  
      if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
      }
  
      const { token } = req.cookies;
  
      jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
          console.error('JWT Verification Error:', err.message);
          return res.status(401).json({ error: 'Unauthorized' });
        }
  
        const { id, title, summary, content } = req.body;
  
        const postDoc = await Post.findById(id);
  
        if (!postDoc) {
          return res.status(404).json({ error: 'Post not found' });
        }
  
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
  
        if (!isAuthor) {
          return res.status(403).json({ error: 'You are not authorized to update this post' });
        }
  
        await postDoc.updateOne({
          title,
          summary,
          content,
          files: newPath ? newPath : postDoc.files,
        });
  
    const updatedPost = await Post.findById(id);
        res.json(updatedPost);
      });
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/post/:id', async (req, res) => {
    try {
      const { id } = req.params;
  
     
      const postDoc = await Post.findById(id);
      if (!postDoc) {
        return res.status(404).json({ error: 'Post not found' });
      }
  
      
      const { token } = req.cookies;
      jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
          console.error('JWT Verification Error:', err.message);
          return res.status(401).json({ error: 'Unauthorized' });
        }
  
       
        if (JSON.stringify(postDoc.author) !== JSON.stringify(info.id)) {
          return res.status(403).json({ error: 'Forbidden. You are not the author of this post.' });
        }
  
       
        await postDoc.deleteOne();
  
        
  
        res.json({ success: true, message: 'Post deleted successfully' });
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  

app.listen(4000);
//BXPCUIZTgk5V5odu
//mongodb+srv://karthikeyanskarthikeyans000:BXPCUIZTgk5V5odu@cluster0.z4bvdlv.mongodb.net/?retryWrites=true&w=majority
