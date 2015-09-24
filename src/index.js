'use strict';

import { pascalCase as pascal } from 'change-case';
import mongoose from 'mongoose';
import getModels, { init as supermodel } from 'super-model';
import assert from 'assert';

export * from './methods';

export default getModels;

export function init(config, next) {
  config = Object.assign({
    factory: (schema) => {
      if (!schema.identity) return {};
      if (!schema.tableName) schema.tableName = pascal(schema.identity);

      let obj = JSON.parse(JSON.stringify(schema));
      let real = new mongoose.Schema(schema.attributes, {
        collection: obj.tableName,
        toObject: { getters: true },
        toJSON: { getters: true }
      });

      if (schema.virtuals) Object.keys(schema.virtuals)
        .map(key => {
          let virtual = schema.virtuals[key];
          if (virtual.get) real.virtual(key).get(virtual.get);
          if (virtual.set) real.virtual(key).set(virtual.set);
        });

      let model = mongoose.model(obj.tableName, real);

      Object.keys(schema.lifecycle)
        .map(key => {
          model[key] = schema.lifecycle[key];
        });

      return model;
    }
  }, config);

  assert(config.url, 'MongoDB URL not defined!');

  mongoose.connect(config.url);
  return supermodel(config)
    .nodeify(next);
}
