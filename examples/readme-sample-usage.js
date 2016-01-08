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
// Derialized payload: {"aDuration:duration":"10m","name":"pluggable json","anInfinityValue:infinity":"Infinity"}

// Deserialize back into the real values
let deserializedPayload = pluggableJSON.deserialize(serializedPayload);

console.log(`aDuration: ${deserializedPayload.aDuration.toString()}`);
// aDuration: The duration is 10m

console.log(`Deserialized Infinity is equal to Infinity: ${deserializedPayload.anInfinityValue === Infinity}`);
// Deserialized Infinity is equal to Infinity: true
