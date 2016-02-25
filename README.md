# Pluggable JSON

[![Build Status](https://travis-ci.org/juttle/pluggable-json.svg)](https://travis-ci.org/juttle/pluggable-json)

PluggableJSON lets you serialize (to JSON) and deserialize objects and arrays with values that are otherwise not serializable to JSON. This means you can now serialize values like `Infinity`, `NaN`, and your own objects to send over HTTP or websockets. PluggableJSON works by accepting pluggable serializers to handle these special values.

## Getting started
```
$ npm install pluggable-json
```

## Sample usage
```javascript
/*eslint-disable no-console */
import PluggableJSON from "pluggable-json";

// A custom class that is not JSONable
class Duration {
    constructor(number, unit) {
        this.number = number;
        this.unit = unit;
    }
    getNumber() {
        return this.number;
    }
    getUnit() {
        return this.unit;
    }
    toString() {
        return `The duration is ${this.number}${this.unit}`;
    }
}

// The serializer that can handle serializing and deserializing
// the Duration class above.
const durationSerializer = {
    type: "duration",
    isSerializable(value) {
        return value instanceof Duration;
    },
    serialize(value) {
        return `${value.getNumber()}${value.getUnit()}`;
    },
    deserialize(value) {
        let match = value.match(/^(\d+)(\w)$/);
        let number = parseInt(match[1], 10);
        let unit = match[2];
        return new Duration(number, unit);
    }
};

// The JavaScript Infinity value is not JSONable.
// This serializer handles it.
const infinitySerializer = {
    type: "infinity",
    isSerializable(value) {
        return value === Infinity;
    },
    serialize(value) {
        return "Infinity";
    },
    deserialize(value) {
        return Infinity;
    }
};

// A JavaScript object we want to send over http. It contains both values
// that JSON can handle as well as values it can't. We will use our serializers
// to handle the latter.
let payload = {
    aDuration: new Duration(10, "m"),
    name: "pluggable json",
    anInfinityValue: Infinity
};

// Instantiate PluggableJSON with our serializers
let pluggableJSON = new PluggableJSON([durationSerializer, infinitySerializer]);

// serialize
let serializedPayload = pluggableJSON.serialize(payload);

// the string that can be sent across http or websockets
console.log(`Serialized payload: ${serializedPayload}`);
// Deserialized payload: Serialized payload: {"aDuration":"$duration$10m","name":"pluggable json","anInfinityValue":"$infinity$Infinity"}

// Deserialize back into the real values
let deserializedPayload = pluggableJSON.deserialize(serializedPayload);

console.log(`aDuration: ${deserializedPayload.aDuration.toString()}`);
// aDuration: The duration is 10m

console.log(`Deserialized Infinity is equal to Infinity: ${deserializedPayload.anInfinityValue === Infinity}`);
// Deserialized Infinity is equal to Infinity: true
```

## API

### new PluggableJSON(serializers [, separator])
Instantiate a new `PluggableJSON` object with an array of serializers and an optional separator. The separator defaults to `:` and is used in encoding object properties and array values. If `:` is a commonly occurring string in your field names, specify a different separator.

### serialize(value [, options])
Serializes the given object or array to JSON, using the passed in `serializers` where applicable.

Options:
 - `toObject` (defaults to `false`): If `true` is passed, returns an object that can be safely passed to `JSON.stringify`.

### deserialize(value)
Deserializes the given JSON (or parsed object/array) and returns the original object or array with everything "hydrated."

## Custom Serializers
Each custom serializer is an object that must implement the following properties.

### type
This property specifies the value `type` that this serializer serializes. The type is used in serializing and deserializing to keep track of which value is which type. The `type` must be unique across all `serializers` passed into the constructor.

### isSerializable(value)
A function that accepts a value and returns whether this serializer can serialize it. This check should be as strict as possible so the serializer doesn't end up serializing another serializer's value. For example, if serializing an instance of a class, you can use `instanceof`.

### serialize(value)
Given a value, return the serialized string value.

### deserialize(value)
Given a serialized string, return the deserialized object.
