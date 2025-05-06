import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('belts', 'routes/belts.tsx'),
  route('chains', 'routes/chains.tsx'),
] satisfies RouteConfig;
