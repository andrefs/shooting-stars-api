import mongoose from 'mongoose';
import pagPlugin from 'mongoose-paginate';
import createdModified from 'mongoose-createdmodified';
import _ from 'lodash';
import config from '../config/index.cjs';
import path from 'path';
import Jimp from 'jimp';
import { log } from '../lib/logger.js';
import errors from 'restify-errors';
import md5 from 'md5';
import { promises as fs } from 'fs';
import MongooseSequence from 'mongoose-sequence';
import Promise from 'bluebird';
import { NoMoreItemsError } from '../lib/errors/index.js';
import Pair from './Pair.js';
import Triple from './Triple.js';

mongoose.plugin(pagPlugin);
mongoose.plugin(createdModified.createdModifiedPlugin, { index: true });
const autoIncrement = MongooseSequence(mongoose);

const ItemSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: false
  },
  imageUrl: {
    type: String,
    required: false
  },
  imagePath: {
    type: String,
    required: false
  },
  isActive: {
    type: Boolean,
    default: false,
    required: true
  }
});

ItemSchema.plugin(autoIncrement, { id: 'item_counter', 'inc_field': 'seqNum' });

const generatePairs = (doc, otherItems) => {
  if (otherItems.length < 1) { return []; }
  return otherItems.map(other => ({
    itemA: doc,
    itemB: other
  }));
};

ItemSchema.pre('save', function(next) {
  this.wasNew = this.isNew;
  return next();
});

const generateTriples = (doc, otherItems) => {
  let triples = [];
  if (otherItems.length < 2) { return []; }
  for (let i = 0; i < otherItems.length - 1; i++) {
    for (let j = i + 1; j < otherItems.length; j++) {
      triples.push({
        itemA: doc,
        itemB: otherItems[i],
        itemC: otherItems[j]
      });
    }
  }
  return triples;
};

ItemSchema.statics.activateNext = async function() {
  let newItem = await this.findOne({ isActive: false }).sort('seqNum');
  let oldItems = await this.find({ isActive: true });

  if (!newItem) {
    return Promise.reject(new NoMoreItemsError());
  }

  await newItem.updateOne({ $set: { isActive: true } });
  newItem = await this.findOne({ _id: newItem._id });

  const pairs = generatePairs(newItem, oldItems || []);
  await Pair.create(pairs);

  const triples = generateTriples(newItem, oldItems || []);
  return Triple.create(triples)
};

ItemSchema.statics.loadItem = function({ name, description, imageUrl, tmpPath }) {
  let item = {};
  item.name = name;
  item.description = description;
  item.imageUrl = imageUrl;

  let filePath;

  return fs.readFile(tmpPath)
    .then(buf => md5(buf))
    .then(fileName => {
      filePath = path.join(config.images.folder, fileName) + '.jpg';
      log.info(`Copying image file to ${filePath}`);
      return Jimp.read(tmpPath);
    })
    .then(file => file.write(filePath))
    .then(() => {
      item.imagePath = filePath;
      return this.create(item);
    })
    .catch((err) => {
      log.error(err);
      throw new errors.InternalError(err.message);
    });
};

export default mongoose.model('Item', ItemSchema);
