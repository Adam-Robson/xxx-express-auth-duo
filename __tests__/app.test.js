const pool = require('../lib/utils/pool');
const setup = require('../data/setup');
const request = require('supertest');
const app = require('../lib/app');
const UserService = require('../lib/services/UserService');

const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@user.com',
  password: '123456'
};

const registerAndLogin = async (userProps = {}) => {
  const password = userProps.password ?? testUser.password;

  const agent = request.agent(app);

  const user = await UserService.create({ ...testUser, ...userProps });

  const { email } = user;
  await agent.post('api/v1/users/sessions').send({ email, password });
  return [agent, user];
};


describe('user routes', () => {
  beforeEach(() => {
    return setup(pool);
  });

  test('creates a new user', async () => {
    const res = await (await request(app).post('api/v1/users')).send(testUser);
    const { firstName, lastName, email } = testUser;
     expect(res.body).toEqual({
      id: expect.any(String),
      firstName,
      lastName,
      email
     })
  })

  test('signs in an existing user', async () => {
    await (await request(app).post('/api/v1/users')).send(testUser);
    const res = await request(app)
    .post('/api/v1/users/sessions')
    .send({ email: 'test@user.com', passwrord: '123456' });
    expect(res.status).toEqual(200)
  })

  test('/protected should return a 401 if not authenticated', async () => {
    const res = await request(app).get('/api/v1/users/protected');
    expect(res.status).toEqual(401);
  })

  test('/protected should return the current user if authenticated', async () => {
    const [agent] = await registerAndLogin();
    const res = await agent.get('/api/v1`/users/protected');
    expect(res.status).toEqual(200);
  })

  test('/users should return 401 if user not admin', async () => {
    const [agent] = await registerAndLogin();
    const res = await agent.get('/api/v1/users/');
    expect(res.status).toEqual(403);
  });

  test('/users should return 200 if user is admin', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/users').send({
      email: 'admin@user.com',
      password: '123456',
      firstName: 'Admin',
      lastName: 'User',
    });
    await agent
      .post('/api/v1/users/sessions')
      .send({ email: 'admin@user.com', password: '123456' });
    const res = await agent.get('/api/v1/users/');
    expect(res.status).toEqual(200);
  });

  test('/users should return a 200 if user is admin', async () => {
    const [agent] = await registerAndLogin({ email: 'admin' });
    const res = await agent.get('/api/v1/users/');
    expect(res.status).toEqual(200);
  });

  test('DELETE /sessions deletes the user session', async () => {
    const [agent] = await registerAndLogin();
    const resp = await agent.delete('/api/v1/users/sessions');
    expect(resp.status).toBe(204);
  });

  afterAll(() => {
    pool.end();
  });
});
