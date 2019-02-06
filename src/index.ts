import { goBack as crrGoBack, goForward as crrGoForward, LocationChangeAction, LOCATION_CHANGE, push, replace, RouterState } from "connected-react-router";
import { FSA } from "flux-standard-action";
import { match, matchPath, RouteProps } from "react-router";
import { Middleware } from "redux";

interface LocationChangeActionFSA extends FSA<RouterState> {
  type: typeof LOCATION_CHANGE;
}

const routeChangeHelper = <InputAction extends FSA<any>>(
  {
    inputType,
    mapper
  }: {
    inputType: InputAction["type"];
    mapper: (payload: InputAction["payload"], lastPath: string | undefined) => FSA<any> | void;
  }
): Middleware =>
  api => next => {
    let lastPath: string | undefined;

    return (action: InputAction | LocationChangeActionFSA) => {
      const result = next(action);

      if(action.type === LOCATION_CHANGE) {
        // keep track of last location to avoid duplicate history entries
        lastPath = action.payload.location.pathname;
      } else if (action.type === inputType && !action.error) {
        const mapped = mapper(action.payload, lastPath);
        if (mapped) {
          api.dispatch(mapped);
        }
      }
      return result;
    };
  };

export const pushRoute = <InputAction extends FSA<any>>(
  {
    inputType,
    routePath
  }: {
    inputType: InputAction["type"];
    routePath: (payload: InputAction["payload"]) => string;
  }
): Middleware =>
  routeChangeHelper<InputAction>({
    inputType,
    mapper: (payload, lastPath) => {
      const newPath = routePath(payload);
      return newPath !== lastPath ? push(newPath) : undefined;
    }
  });

export const replaceRoute = <InputAction extends FSA<any>>(
  {
    inputType,
    routePath
  }: {
    inputType: InputAction["type"];
    routePath: (payload: InputAction["payload"]) => string;
  }
): Middleware =>
  routeChangeHelper<InputAction>({
    inputType,
    mapper: (payload, lastPath) => {
      const newPath = routePath(payload);
      return newPath !== lastPath ? replace(newPath) : undefined;
    }
  });

export const goForward = <InputAction extends FSA<any>>(
  {
    inputType
  }: {
    inputType: InputAction["type"];
  }
): Middleware =>
  routeChangeHelper<InputAction>({
    inputType,
    mapper: () => crrGoForward()
  });

export const goBack = <InputAction extends FSA<any>>(
  {
    inputType
  }: {
    inputType: InputAction["type"];
  }
): Middleware =>
  routeChangeHelper<InputAction>({
    inputType,
    mapper: () => crrGoBack()
  });

export const matchRoute = <RouteParams, OutputType extends FSA<any>>(
  {
    routeProps,
    outputType,
    output
  }: {
    routeProps: RouteProps,
    outputType: OutputType["type"],
    output: (matchResult: match<RouteParams>) => OutputType["payload"]
  }
): Middleware =>
  api => next => {
    // react to location change actions
    return (action: LocationChangeAction) => {
      const result = next(action);
      if (action.type === LOCATION_CHANGE) {
        const matchResult: match<RouteParams> | null = matchPath(action.payload.location.pathname, routeProps);
        if(matchResult) {
          api.dispatch({
            type: outputType,
            payload: output(matchResult)
          });
        }
      }
      return result;
    };
  };
