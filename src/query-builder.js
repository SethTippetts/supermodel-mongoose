'use strict';

import bool from 'boolean';
import Promise from 'bluebird';
import { pascalCase as pascal } from 'change-case';
import Inflect from 'i';
import { get } from 'object-path';
import { Schema } from 'mongoose';

let inflect = new Inflect();

let singularize = inflect.singularize.bind(inflect);

let ObjectId = Schema.Types.ObjectId;

export default (model, {
  where,
  limit,
  include,
  populate,
  fields,
  select,
  order,
  sort,
  offset
} = {}) => {

  // Aliases
  if (sort) order = sort;
  if (populate) include = populate;
  if (fields) select = fields;

  if (!include) include = [];
  if (!Array.isArray(include)) {
    if (typeof include === 'object') include = Object.keys(include);
    if (typeof include === 'string') include = [include];
  }

  if (typeof select === 'string') select = [select];


  let params;
  let method = 'find';
  let isCount = !!where && where.id === 'count';
  let isNew = !!where && where.id === 'new';
  let nestedIncludes = [];

  if (isNew) {
    return generateNew();
  }

  include = include.reduce((prev, curr) => {
    if (~curr.indexOf('.')) {
      nestedIncludes.push(curr);
    } else {
      prev.push(curr);
    }

    return prev;
  }, []);

  if (select) params = { select };
  if (where && where.id) {
    if (isCount) {
      method = 'count';
    } else {
      method += 'One';
      params = { _id: where.id };
    }

    delete where.id;
  }

  let query = model[method](params);

  if (where) query.where(cleanup(where, model));
  if (!isCount) {
    if (order) query.sort(order);
    if (include) include.map(incl => query.populate(incl));
    if (offset) query.skip(offset);
    if (limit) query.limit(limit);
  }

  return query.then(data => {
    if (isCount) return { count: data };
    if (!nestedIncludes.length) return data;

    // Include nested populations
    return Promise.reduce(nestedIncludes, (data, incl) => {
      let [, nested ] = incl.split('.');
      return model.populate(data, {
        path: incl,
        model: pascal(singularize(nested))
      });
    }, data);
  });
};

function generateNew() {
  var objectId = new ObjectId();
  objectId = objectId.toHexString();
  return {
    id: objectId,
    _id: objectId
  };
}

export function cleanup(where, model) {
  return Object.keys(where)
    .reduce((obj, prop) => {
      // TODO: Probably bad practice to reference underscored properties...
      let castType = get(model, ['schema', 'paths', prop, 'instance'], 'String').toLowerCase();
      obj[prop] = castType ? coerce(where[prop], castType) : where[prop];
      return obj;
    }, {});
}

export function coerce(val, type) {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) return val.map((v) => coerce(v, type));
  if (typeof val === 'object') return Object.keys(val).reduce((prev, curr) => {
    prev[curr] = coerce(val[curr], type);
    return prev;
  }, {});
  if (type === 'string' || type === 'objectid') return val.toString();
  if (type === 'integer') return parseInt(val);
  if (type === 'double' || type === 'float') return parseFloat(val);
  if (type === 'boolean') return bool(val);
}
