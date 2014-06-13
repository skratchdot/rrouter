/**
 * @jsx React.DOM
 */
'use strict';

var pattern  = require('url-pattern');
var qs       = require('qs');
var hasView  = require('./descriptors').hasView;
var isString = require('./isString');

/**
 * Normalize path
 *
 * @param {String} path
 * @returns {String}
 */
function normalize(path) {
  if (!path) {
    return '/';
  }
  if (path[0] !== '/') {
    path = '/' + path;
  }
  if (path[path.length - 1] !== '/') {
    path = path + '/';
  }
  return path;
}

/**
 * Match route against path
 *
 * @param {Route} route
 * @param {String} path
 * @returns {Match|Null}
 */
function matchRoute(route, path) {

  if (route.pattern === undefined && route.path !== undefined) {
    var routePattern;

    if (route.path instanceof RegExp) {
      routePattern = route.path;
    } else {
      var routePath = normalize(route.path);
      routePattern = route.children.length > 0 ? routePath + '*' : routePath;
    }

    Object.defineProperty(route, 'pattern', {
      enumerable: false,
      value: pattern.newPattern(routePattern)
    });
  }

  if (route.pattern) {
    var match = route.pattern.match(path);

    if (match) {
      if (route.pattern.isRegex) {
        match = {_: match};
      }

      if (!match._ || match._[0] === '/' || match._[0] === '') {
        delete match._;
      }
    }

    return match;

  } else {
    return path === '/' || path === '' ? {} : {_: [path]};
  }
}

function matchRoutesImpl(routes, path, query, trace, activeTrace, originalPath) {
  routes = Array.isArray(routes) ? routes : [routes];
  trace = trace || [];
  activeTrace = activeTrace || [];
  originalPath = originalPath === undefined ? path : originalPath;

  for (var i = 0, len = routes.length; i < len; i++) {
    var route = routes[i];
    var match = matchRoute(route, normalize(path));

    if (!match) {
      continue;
    }

    var step = {route, match, props: {query}};

    trace = trace.concat(step);

    activeTrace = route.view !== undefined ?
      [step] : activeTrace.concat(step);

    if ((match._ || !hasView(route)) && route.children.length > 0) {
      return matchRoutesImpl(
        route.children, match._ ? match._[0] : '/', query,
        trace, activeTrace, originalPath);
    } else {
      return {path: originalPath, query, route, trace, activeTrace};
    }
  }

  return {
    path: originalPath,
    query,
    route: undefined,
    trace: [],
    activeTrace: []
  };
}

/**
 * Match routes against path
 *
 * @param {Route} routes
 * @param {String} path
 * @returns {Match}
 */
function matchRoutes(routes, path, query) {
  query = query === undefined ? {} : isString(query) ? qs.parse(query) : query;
  return matchRoutesImpl(routes, path, query);
}

module.exports = matchRoutes;
