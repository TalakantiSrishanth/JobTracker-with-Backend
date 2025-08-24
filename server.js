const express=require("express");
const app=express();
app.set("view engine", "ejs");
app.use(express.json());
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/JobTracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("MongoDB connected to:", process.env.MONGODB_URI ? "Cloud Database" : "Local Database");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

const taskSchema = new mongoose.Schema({
  companyname: String,
  jobtitle: String,
  status: String
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  tasks: [taskSchema],
  taskid: { type: Number, default: 1} 
});

const User = mongoose.model('User', userSchema);

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));

// Add root route to redirect to login
app.get("/", (req, res) => {
  res.redirect('/login.html');
});

// Add explicit route for login.html
app.get("/login.html", (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

// Add explicit route for register.html
app.get("/register.html", (req, res) => {
  res.sendFile(__dirname + '/public/register.html');
});

async function verify(req, res, next) {
  const { username, password } = req.query;
  const user = await User.findOne({ username, password });
  if (user) {
    req.user = user;
    next();
  } else {
    res.status(401).send("Invalid Credentials");
  }
}

app.get("/login",verify,(req,res)=>{
   res.redirect(`/dashboard/${req.user.id}`);
});
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const existing = await User.findOne({ username });
  if (existing) return res.status(400).send("Username already exists");

  const newUser = new User({ username, password, tasks: [] });
  await newUser.save();

  res.redirect(`/dashboard/${newUser._id}`);
});
app.get("/dashboard/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send("User doesn't exist");
  res.render("dashboard", { user });
});

app.get("/dashboard/:id/addtask", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).render("404", { message: "User not found" });
  res.render("add", { user });
});

app.get("/tasks/:uid/:tid/edit", async (req, res) => {
  const { uid, tid } = req.params;
  const user = await User.findById(uid);
  if (!user) return res.status(404).render("404", { message: "User not found" });
  const task = user.tasks.find(t => t.id == tid);
  if (!task) return res.status(404).render("404", { message: "Job Details not found" });
  res.render("edit", { user, task });
});


app.post("/tasks/:uid/:tid/edittask", async (req, res) => {
  const { uid, tid } = req.params;
  const user = await User.findById(uid);
  if (!user) return res.status(404).render("404", { message: "User not found" });
  const task = user.tasks.find(t => t.id == tid);
  if (!task) return res.status(404).render("404", { message: "Job Details not found" });

  const { companyname, jobtitle, status } = req.body;
  task.companyname = companyname;
  task.jobtitle = jobtitle;
  task.status = status;

  await user.save();
  res.redirect(`/dashboard/${user._id}`);
});

app.post("/tasks/:uid/:tid/delete", async (req, res) => {
  const { uid, tid } = req.params;
  const user = await User.findById(uid);
  if (!user) return res.status(404).send("User not found");

  user.tasks = user.tasks.filter(task => task.id != tid);
  await user.save();

  res.redirect(`/dashboard/${uid}`);
});

app.post("/tasks/:id/add", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).render("404", { message: "User not found" });

  const { companyname, jobtitle, status } = req.body;
  user.tasks.push({ id: `${user.taskid}`, companyname, jobtitle, status });
  user.taskid++;
  await user.save();

  res.redirect(`/dashboard/${user._id}`);
});

app.get("/logout",(req,res)=>{
    res.redirect('/login.html');
})
app.listen(3000,()=>{
   
});