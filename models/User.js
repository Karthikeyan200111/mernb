const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const userSchema = new Schema({
  username: { type: String, minlength: 4, unique: true },
  password: {
    type: String,
   
  },
  phoneNumber: {
    type: Number, // or type: Number, depending on your use case
    
    unique: true
  }
});

const userModel = model("User", userSchema);
module.exports = userModel;
