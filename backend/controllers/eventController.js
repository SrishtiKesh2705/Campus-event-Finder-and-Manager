const Event=require("../models/Event");

exports.createEvent=async(req,res)=>{
 const e=new Event({...req.body,createdBy:req.user.id});
 await e.save();
 res.json(e);
};

exports.getEvents=async(req,res)=>{
 const {type,search,page=1,limit=10}=req.query;
 let q={registrationDeadline:{$gte:new Date()}};
 if(type) q.type=type;
 if(search) q.title={$regex:search,$options:"i"};
 const events=await Event.find(q)
 .sort({registrationDeadline:1})
 .skip((page-1)*limit)
 .limit(parseInt(limit));
 res.json(events);
};

exports.getEventById=async(req,res)=>{
 const e=await Event.findById(req.params.id);
 if(!e) return res.status(404).json({msg:"Not found"});
 res.json(e);
};

exports.updateEvent=async(req,res)=>{
 const e=await Event.findByIdAndUpdate(req.params.id,req.body,{new:true});
 res.json(e);
};

exports.deleteEvent=async(req,res)=>{
 await Event.findByIdAndDelete(req.params.id);
 res.json({msg:"Deleted"});
};