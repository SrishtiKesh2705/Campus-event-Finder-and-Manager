const Registration=require("../models/Registration");
const Event=require("../models/Event");

exports.registerEvent=async(req,res)=>{
 const event=await Event.findById(req.params.eventId);
 if(!event || event.registrationDeadline<new Date())
  return res.status(400).json({msg:"Closed"});
 try{
  const { name, collegeId, collegeName, email } = req.body;
  await new Registration({userId:req.user.id,eventId:req.params.eventId, name, collegeId, collegeName, email}).save();
  res.json({msg:"Registered"});
 }catch(e){
  if(e.code===11000) return res.status(400).json({msg:"Already registered"});
  res.status(500).send("error");
 }
};

exports.myRegistrations=async(req,res)=>{
 const r=await Registration.find({userId:req.user.id}).populate("eventId");
 res.json(r);
};

exports.eventRegistrations=async(req,res)=>{
 const r=await Registration.find({eventId:req.params.id}).populate("userId");
 res.json(r);
};