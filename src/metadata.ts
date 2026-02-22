/* eslint-disable */
export default async () => {
  const t = {
    ['./auth/models/sign-in.model']: await import(
      './auth/models/sign-in.model'
    ),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./user/dto/create-user.dto'),
          {
            CreateUserDto: {
              email: { required: true, type: () => String, format: 'email' },
              password: { required: true, type: () => String, minLength: 6 },
              name: { required: true, type: () => String },
              role: { required: true, type: () => Object },
            },
          },
        ],
        [
          import('./auth/dto/sign-in.dto'),
          {
            SignInDto: {
              username: { required: true, type: () => String },
              password: { required: true, type: () => String },
            },
          },
        ],
        [
          import('./auth/dto/forgot-password.dto'),
          {
            ForgotPasswordDto: {
              email: { required: true, type: () => String, format: 'email' },
            },
          },
        ],
        [
          import('./auth/dto/reset-password.dto'),
          {
            ResetPasswordDto: {
              token: { required: true, type: () => String },
              newPassword: { required: true, type: () => String, minLength: 6 },
            },
          },
        ],
      ],
      controllers: [
        [
          import('./app.controller'),
          { AppController: { getHello: { type: String } } },
        ],
        [
          import('./health/health.controller'),
          { HealthController: { health: { type: String } } },
        ],
        [
          import('./user/user.controller'),
          {
            UserController: {
              findMany: {},
              findOne: {},
              create: { type: t['./auth/models/sign-in.model'].SignIn },
            },
          },
        ],
        [
          import('./auth/auth.controller'),
          {
            AuthController: {
              signIn: {},
              signOut: {},
              forgotPassword: {},
              resetPassword: {},
              googleAuth: {},
              googleAuthCallback: {},
            },
          },
        ],
      ],
    },
  };
};
