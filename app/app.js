const express = require('express')
const maria = require('mysql')
const path = require('path')
const app = express()
const port = 80

require("dotenv").config();

const db = maria.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PSWD,
  database: process.env.DB_NAME
});
db.connect();

app.use(express.static("public"));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/html/index.html');
})

app.get('/teams', (req, res) => {
  db.query('SELECT * FROM teams', function (err, rows, fields) {
    res.send(rows);
  });
})

app.get('/search', (req, res) => {
  // 남은 횟수 검색
  db.query('SELECT * FROM teams WHERE team_name = "' + req.query.team + '"', function(err, rows, fields){
    if(rows.length === 0) {
      res.send({
        'status': 'WRONG_TEAM',
        'text': '팀 정보가 잘못되었습니다.',
        'chance': 0
      });

      return true;
    }

    if(rows[0].chance_count === 0) {
      res.send({
        'status': 'NO_REMAIN_CHANCE',
        'text': '남은 검색횟수가 없습니다.',
        'chance': 0
      });

      return true;
    }

    const team = rows[0];

    // 역 이름 검색
    db.query('SELECT * FROM hints WHERE name = "' + req.query.name + '"', function (err, rows, fields) {
      if(rows.length === 0) {
        // 역 이름이 아닌 경우
        res.send({
          'status': 'WRONG_INPUT',
          'text': '일치하는 역 이름이 없습니다.',
          'chance': team.chance_count
        });
      } else {
        // 검색횟수 차감
        db.query('UPDATE teams SET chance_count = chance_count - 1 WHERE team_name = "' + team.team_name + '"');

        if(rows[0].taken_at !== null) {
          // 누군가 가져간 힌트
          res.send({
            'status': 'TAKEN_HINT',
            'text': rows[0].taken_team + '에서 이미 가져간 힌트입니다.',
            'chance': team.chance_count - 1
          });
        } else if(rows[0].hint !== null) {
          // 처음 열리는 힌트
          db.query('UPDATE hints SET taken_at = NOW(), taken_team = "' + team.team_name + '" WHERE id = "' + rows[0].id + '"');

          res.send({
            'status': 'EXISTS_HINT',
            'text': rows[0].hint,
            'chance': team.chance_count - 1
          });
        } else {
          // 힌트가 처음부터 없는 경우
          res.send({
            'status': 'NO_EXISTS_HINT',
            'text': '힌트가 없습니다',
            'chance': team.chance_count - 1
          });
        }
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
