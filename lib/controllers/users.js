const { Router } = require('express');
const User = require('../controllers/users');

module.exports = Router.post('/', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
