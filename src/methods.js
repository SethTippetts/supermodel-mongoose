'use strict';

import queryBuilder from './query-builder';
import { set } from 'object-path';
import Promise from 'bluebird';

/*** ---CRUD Methods--- ***/

/** Query resource list **/
export function list(model, req, cb) {
  return Promise.resolve(req.query.filter)
    .then(body => model.beforeAccess(body, req))
    .then(body => queryBuilder(model, body))
    .then(body => model.afterAccess(body, req))
    .nodeify(cb);
}

/** Create new resource **/
export function create(model, req, cb) {
  let { body } = req;

  return Promise.resolve(body)
    .then(body => model.beforeSave(body, req))
    .then(body => model.beforeCreate(body, req))
    .then(body => model.create(body))
    .then(body => model.afterSave(body, req))
    .then(body => model.afterCreate(body, req))
    .nodeify(cb);
}

/** Return a single resource by ID **/
export function get(model, req, cb) {
  let { query, params } = req;
  set(query, 'filter.where.id', params.id);
  return list(model, req, cb);
}

/** Update a single resource by ID **/
export function update(model, req, cb) {
  let { body, params } = req;

  return Promise.resolve(body)
    .then(body => model.beforeSave(body, req))
    .then(body => model.beforeUpdate(body, req))
    .then(body => model.update({ _id: params.id }, body))
    .then(({ electionId }) => {
      body.id = body._id = electionId;
      return body;
    })
    .then(isSingle)
    .then(body => model.afterSave(body, req))
    .then(body => model.afterUpdate(body, req))
    .nodeify(cb);
}

/** Destroy a single resource by ID **/
export function destroy(model, req, cb) {
  let { query, params } = req;

  return Promise.resolve(query.filter)
    .then(body => model.beforeDelete(body, req))
    .then(() => model.remove({ _id: params.id }))
    .then(isSingle)
    .then(body => model.afterDelete(body, req))
    .nodeify(cb);
}

function isSingle(results) {
  if (Array.isArray(results) && results.length === 1) return results[0];
  return results;
}
