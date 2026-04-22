const mongoose=require("mongoose");
module.exports=mongoose.model("User",new mongoose.Schema({
 name:{type:String,required:true},
 email:{type:String,unique:true},
 password:String,
 role:{type:String,enum:["admin","user","student"],default:"user"}
},{timestamps:true}));