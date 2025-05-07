import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('belts', 'routes/belts.tsx'),
  route('chains', 'routes/chains.tsx'),
  route('motors', 'routes/motors.tsx'),
  route('linear', 'routes/linear.tsx'),
] satisfies RouteConfig;
