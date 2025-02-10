// https://expressjs.com/
// https://expressjs.com/en/resources/middleware/cors.html

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors()); // 미들웨어
// 모두에게 오픈.

app.use(express.json()); // JSON으로 들어오는 body를 인식

app.get("/", (req, res) => {
  //   res.send("Hello World!");
  res.send("버튼을 눌렀네용!");
  // 수정 후 자동으로 리빌드 되는 건 자연스러운게 아님
  // 무언가 툴들이 도는 거에요... 여기선 nodemon
});

app.post("/", (req, res) => {
  const { body } = req;
  const { text } = body;
  res.json({ text });
});

app.listen(port, () => {
  console.log(`Server running on {port}`);
});
