import PluggableJSON from "../src";
import {expect} from "chai";

const serializeAndDeserialize = (pluggableJSON, value) => {
    return pluggableJSON.deserialize(pluggableJSON.serialize(value));
};

// a class we will use for serializing and deserializing
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

// the serializer for the above class
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

const myDuration = new Duration(10, "m");

describe("Pluggable JSON", () => {
    let pluggableJSON = new PluggableJSON();
    it("native JSON values", () => {
        let obj = {
            number: 1,
            boolean: true,
            string: "string",
            "str:ing": "str:ing", // separator in object key and value
            null: null,
            array: [1, true, {a: "a string"}],
            object: {
                b: [
                    1,
                    "a",
                    "ab:cc" // separator in array value
                ],
                c: 2
            }
        };

        expect(serializeAndDeserialize(pluggableJSON, obj)).to.deep.equal(obj);
    });

    it("serialize to object", () => {
        let obj = {
            number: 1
        };

        expect(pluggableJSON.serialize(obj, { toObject: true } )).to.deep.equal(obj);
    });

    it("deserialize from object", () => {
        let obj = {
            number: 1
        };

        expect(pluggableJSON.deserialize(pluggableJSON.serialize(obj, { toObject: true } ))).to.deep.equal(obj);
    });

    describe("custom Serializers", () => {
        describe("one serializer", () => {
            let pluggableJSON;

            before(() => {
                pluggableJSON = new PluggableJSON([durationSerializer]);
            });

            it("':' is the default separator", () => {
                let obj = {
                    "myDuration": myDuration
                };

                expect(Object.keys(pluggableJSON.serialize(obj, { toObject: true } ))[0]).to.contain(":");
            });

            it("value in object", () => {
                let obj = {
                    "myDuration": myDuration
                };

                expect(serializeAndDeserialize(pluggableJSON, obj).myDuration.toString()).to.equal(myDuration.toString());
            });

            it("value in nested object", () => {
                let obj = {
                    "someObj": {
                        "myDuration": myDuration
                    }
                };

                expect(serializeAndDeserialize(pluggableJSON, obj).someObj.myDuration.toString()).to.equal(myDuration.toString());
            });

            it("value in array", () => {
                let array = [
                    myDuration
                ];

                expect(serializeAndDeserialize(pluggableJSON, array)[0].toString()).to.equal(myDuration.toString());
            });

            it("value in nested array", () => {
                let array = [
                    [myDuration]
                ];

                expect(serializeAndDeserialize(pluggableJSON, array)[0][0].toString()).to.equal(myDuration.toString());
            });
        });

        describe("two serializers", () => {
            let pluggableJSON;

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

            before(() => {
                pluggableJSON = new PluggableJSON([durationSerializer, infinitySerializer]);
            });

            it("value in object", () => {
                let obj = {
                    "myDuration": myDuration,
                    "myInfinity": Infinity
                };

                let deserializedObj = serializeAndDeserialize(pluggableJSON, obj);

                expect(deserializedObj.myDuration.toString()).to.equal(myDuration.toString());
                expect(deserializedObj.myInfinity).to.equal(Infinity);
            });
        });

        describe("separators", () => {
            let pluggableJSON;
            let customSeparator = "S";

            before(() => {
                pluggableJSON = new PluggableJSON([durationSerializer], customSeparator);
            });

            it("use custom separator", () => {
                let obj = {
                    "myDuration": myDuration
                };

                let result = pluggableJSON.serialize(obj);

                expect(serializeAndDeserialize(pluggableJSON, obj).myDuration.toString()).to.equal(myDuration.toString());
                expect(JSON.stringify(result)).to.contain(customSeparator);
            });

            describe("user input already contains separator", () => {
                describe("in object", () => {
                    it("field name", () => {
                        let obj = {};
                        obj[`some${customSeparator}Value`] = myDuration;

                        expect(serializeAndDeserialize(pluggableJSON, obj)[`some${customSeparator}Value`].toString()).to.equal(myDuration.toString());
                    });

                    it("field value", () => {
                        let obj = {};

                        let valueWithSeparator = new Duration(1,customSeparator);
                        obj[`myDuration`] = valueWithSeparator;

                        let result = pluggableJSON.serialize(obj);

                        expect(serializeAndDeserialize(pluggableJSON, obj).myDuration.toString()).to.equal(valueWithSeparator.toString());
                        expect(result).to.contain(customSeparator);
                    });
                });

                describe("in array", () => {
                    it("value", () => {
                        let valueWithSeparator = new Duration(1,customSeparator);
                        let array = [valueWithSeparator];
                        let result = pluggableJSON.serialize(array);

                        expect(serializeAndDeserialize(pluggableJSON, array)[0].toString()).to.equal(valueWithSeparator.toString());
                        expect(result).to.contain(customSeparator);
                    });
                });
            });
        });

        describe("invalid serializers", () => {
            it("missing type", () => {
                let serializer = {
                    isSerializable(value) {
                        return true;
                    },
                    serialize(value) {
                        return "";
                    },
                    deserialize(value) {
                        return "";
                    }
                };

                expect(() => new PluggableJSON([serializer])).to.throw(Error);
            });

            it("missing isSerializable", () => {
                let serializer = {
                    type: "",
                    serialize(value) {
                        return "";
                    },
                    deserialize(value) {
                        return "";
                    }
                };

                expect(() => new PluggableJSON([serializer])).to.throw(Error);
            });

            it("missing serialize", () => {
                let serializer = {
                    type: "",
                    isSerializable(value) {
                        return true;
                    },
                    deserialize(value) {
                        return "";
                    }
                };

                expect(() => new PluggableJSON([serializer])).to.throw(Error);
            });

            it("missing deserialize", () => {
                let serializer = {
                    type: "",
                    isSerializable(value) {
                        return true;
                    },
                    serialize(value) {
                        return "";
                    }
                };

                expect(() => new PluggableJSON([serializer])).to.throw(Error);
            });

            it("two serializers with the same type", () => {
                let serializer1 = {
                    type: "serializer",
                    isSerializable(value) {
                        return true;
                    },
                    serialize(value) {
                        return "";
                    },
                    deserialize(value) {
                        return "";
                    }
                };

                let serializer2 = {
                    type: "serializer",
                    serialize(value) {
                        return "";
                    },
                    deserialize(value) {
                        return "";
                    }
                };

                expect(() => new PluggableJSON([serializer1, serializer2])).to.throw(Error);
            });
        });
    });
});
