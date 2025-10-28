import RoutesContext from '@/contexts/RoutesContext';
import { useContext, useMemo } from 'react';
import { useMatches } from 'react-router';

const PATH_PARAM_ALLOW_LIST = new Set(['tableTab']);

const useRoute = () => {
  const routes = useContext(RoutesContext);
  const matches = useMatches();

  return useMemo(() => {
    const match = matches.at(-1);

    if (!match) {
      return undefined;
    }

    const routeId = match.id;
    const routePath = routeId.split('-');
    routePath.shift();
    let routePart = routes[0];
    let route = '';

    for (const routePathPart of routePath) {
      if (!routePart.children) {
        return undefined;
      }

      routePart = routePart.children[Number(routePathPart)];
      route += routePart.path ? `/${routePart.path}` : '';
    }

    for (const param of PATH_PARAM_ALLOW_LIST) {
      route = route.replace(new RegExp(`/:${param}\\??`), match.params[param] ? `/${match.params[param]}` : '');
    }

    for (const [param, value] of Object.entries(match.params)) {
      if (PATH_PARAM_ALLOW_LIST.has(param)) {
        route = route.replace(`:${param}`, value ?? '');
      }
    }

    return route;
  }, [matches, routes]);
};

export default useRoute;
