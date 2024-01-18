/**
 * access controller
 */

import { factories } from '@strapi/strapi';
import utils from '@strapi/utils';
import _ from 'lodash';
import { Access, AccessTypes, Operation, User } from '../../../definitions';
import crypto from 'crypto';
import { Strapi } from '@strapi/strapi';
import { AccessTokenTypes } from '../../../definitions/constants/AccessTokenType';
const { sanitize } = utils;

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');

  return sanitize.contentAPI.output(user, userSchema, { auth });
};

export default factories.createCoreController('api::access.access', ({ strapi }: { strapi: Strapi }) => ({
  async refresh(ctx) {
    const { user } = ctx.state;
    const { id } = user;

    const { jwt } = strapi.plugins['users-permissions'].services;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exp, iat, ...origToken } = await jwt.getToken(ctx);
    const token = jwt.issue({ ...origToken, id });

    ctx.send({
      jwt: token,
      user: await sanitizeUser(user, ctx),
    });
  },
  async token(ctx) {
    const { accessToken } = ctx.request.body;
    if (!accessToken) return ctx.badRequest('No access token provided');

    const { jwt } = strapi.plugins['users-permissions'].services;

    const accesses = (await strapi.entityService.findMany('api::access.access', {
      filters: { accessToken },
      populate: {
        operation: {
          fields: ['id'],
        },
      },
      limit: 1,
    })) as Access[];
    const access = _.first(accesses);

    if (!access) return ctx.unauthorized('Invalid access token');
    if (!access.active) return ctx.unauthorized('Access is not active anymore');
    if (!access.operation) return ctx.unauthorized('Access has no operation assigned');
    if (access.expiresOn && new Date(access.expiresOn).getTime() < Date.now()) return ctx.unauthorized('Access is not active anymore');

    const accessUsers = (await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: { username: `operation_${access.type}` },
      limit: 1,
    })) as User[];
    const accessUser = _.first(accessUsers);

    if (!accessUser) return ctx.unauthorized(`Couldn't find the default access user for type ${access.type}`);

    const token = jwt.issue({ id: accessUser.id, operationId: access.operation.id, permission: access.type });

    await strapi.entityService.delete('api::access.access', access.id)

    ctx.send({
      jwt: token,
      user: await sanitizeUser(accessUser, ctx),
    });
  },
  async generate(ctx) {
    const { user } = ctx.state;
    const { id } = user;
    const { name, type, operationId, tokenType } = ctx.request.body;

    if (!type) return ctx.badRequest('You must define the "type" property');
    if (!Object.values(AccessTypes).includes(type))
      return ctx.badRequest('The "type" property has an invalid value. Allowed values are: [read, write, admin]');

    if (!operationId) return ctx.badRequest('You must define the "operationId" property');
    const operations = (await strapi.entityService.findMany('api::operation.operation', {
      filters: {
        id: operationId,
        organization: {
          users: {
            id: { $eq: id },
          },
        },
      },
      limit: 1,
    })) as Operation[];
    if (!operations.length)
      return ctx.badRequest('The operation you provided does not exist or the operation does not match your account organization!');
    const operation = _.first(operations);

    const accessToken = tokenType === AccessTokenTypes.LONG ?
     crypto.randomBytes(16).toString('hex') :
     crypto.randomInt(999999).toString().padStart(6, '0');

    const expiresOn = tokenType === AccessTokenTypes.LONG ? null : (new Date(Date.now()+1000*60*15));

    await strapi.entityService.create('api::access.access', {
      data: {
        active: true,
        name,
        type,
        accessToken,
        operation,
        expiresOn
       },
    });

    ctx.send({ accessToken });
  },
  async find(ctx) {
    if (ctx.query.operationId) {
      ctx.query.filters = {
        operation: {
          id: ctx.query.operationId,
        },
      };
    }
    return await super.find(ctx);
  },
}));
