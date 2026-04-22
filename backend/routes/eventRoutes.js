const router=require("express").Router();
const auth=require("../middleware/auth");
const role=require("../middleware/role");
const c=require("../controllers/eventController");

router.post("/",auth,role(["admin"]),c.createEvent);
router.get("/",c.getEvents);
router.get("/:id",c.getEventById);
router.put("/:id",auth,role(["admin"]),c.updateEvent);
router.delete("/:id",auth,role(["admin"]),c.deleteEvent);

module.exports=router;