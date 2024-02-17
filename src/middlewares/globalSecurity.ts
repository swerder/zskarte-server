/**
 * `globalSecurity` middleware
 */

import { Strapi } from '@strapi/strapi';
import { Context } from 'koa';

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx:Context, next) => {
    //handle only api endpoints
    if (!ctx.request.url.startsWith('/api')){
      return next();
    }
    const before = JSON.stringify(ctx.query);
    //remove any existing filter given from query (they are not allowed / are not secure / could bypass the accessControl logic)
    delete ctx.query.filters;
    //also remove any "population" (for same reasons) => add separate endpoint for the use cases where needed
    delete ctx.query.population;
    const after = JSON.stringify(ctx.query);
    if (before != after){
      strapi.log.info('[global::globalSecurity]: query adjusted, was:' + before);
    }

    await next();

    //verify the accessControl middleware is executed
    if (!ctx.state.accessControlExecuted){
      //the accessControl middleware is not executed
      if (ctx.request.url.startsWith('/api/auth')){
        //do not block default auth endpoints
        return;
      }
      if (ctx.request.url.startsWith('/api/users/me')){
        //do not block users/me endpoint
        return;
      }

      //do not override other invalid response
      if (ctx.response.status >= 200 && ctx.response.status < 300) {
        strapi.log.warn('[global::globalSecurity]: blocked:' + ctx.request.url);
        return ctx.forbidden('This action is forbidden, missing accessControl config.');
      }
    }
  };
};
