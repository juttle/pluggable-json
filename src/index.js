import _ from "underscore";
import escapeRegexp from "escape-regexp";

const ESCAPE_CHAR = "^";

const REQUIRED_SERIALIZER_PROPERTIES = ["type", "isSerializable", "serialize", "deserialize"];

class PluggableJSON {
    constructor(serializers = [], separator = ":") {
        this._validateSerializers(serializers);

        this._serializers = serializers.reduce((result, serializer) => {
            result[serializer.type] = serializer;
            return result;
        }, {});

        this._separator = separator;
        this._nonEscapedSeparator = new RegExp(`([^${escapeRegexp(ESCAPE_CHAR)}])${escapeRegexp(this._separator)}`);
    }

    serialize(value, { toObject = false } = {}) {
        let serializedObject = this._serialize(value);
        return toObject ? serializedObject : JSON.stringify(serializedObject);
    }

    _serialize(value) {
        let serializer = this.findSerializerForValue(value);

        if (serializer) {
            return serializer.serialize(value);
        }
        else if (_.isArray(value)) {
            return value.map((item) => {
                return this.serializeValueInArray(item);
            });
        }
        else if (_.isObject(value)) {
            return _.object(_.pairs(value).map((pair) => {
                return this.serializeValueInObject(pair[0], pair[1]);
            }));
        }
        else {
            return value;
        }
    }

    _deserialize(value, type) {
        if (type) {
            return this._serializers[type].deserialize(value);
        }
        else if (_.isArray(value)) {
            return value.map( (item) => {
                return this.deserializeValueInArray(item);
            });
        }
        else if (_.isObject(value)) {
            return _.object(_.pairs(value).map((pair) => {
                return this.deserializeValueInObject(pair[0], pair[1]);
            }));
        }
        else {
            return value;
        }
    }

    deserialize(value) {
        return this._deserialize(_.isObject(value) ? value : JSON.parse(value));
    }

    // If a serializer exists, serializes value into a string as follows
    // "<serializer type><separator><serialized value>"
    serializeValueInArray(value) {
        let serializer = this.findSerializerForValue(value);

        if (serializer) {
            return `${this._escapeSeparators(serializer.type)}${this._separator}${this._escapeSeparators(serializer.serialize(value))}`;
        }
        else if (_.isString(value)) {
            return this._escapeSeparators(value);
        }
        else {
            return this._serialize(value);
        }
    }

    // If a serializer exists, returns a serialized key and value
    // key: "<original key><separator><serializer type>"
    // value: "<serialized value>"
    serializeValueInObject(key, value) {
        let serializer = this.findSerializerForValue(value);
        return serializer ?
            [`${this._escapeSeparators(key)}${this._separator}${this._escapeSeparators(serializer.type)}`, serializer.serialize(value)]
            : [this._escapeSeparators(key), this._serialize(value)];
    }

    deserializeValueInArray (value) {
        if (_.isString(value)) {
            let components = this._getComponentsFromSerializedString(value);
            if (components.length === 1) {
                return this._deserialize(components[0]);
            }
            else {
                let [fieldType, fieldValue] = components;
                return this._deserialize(fieldValue, fieldType);
            }
        }
        else {
            return this._deserialize(value);
        }
    }

    deserializeValueInObject (key, value) {
        let components = this._getComponentsFromSerializedString(key);

        if (components.length === 1) {
            return [components[0], this._deserialize(value)];
        }
        else {
            let [fieldName, fieldType] = components;
            return [fieldName,this._deserialize(value, fieldType)];
        }
    }

    _validateSerializers(serializers) {
        let serializerTypesSeen = new Map();
        serializers.forEach((serializer, index) => {
            if (serializerTypesSeen.has(serializer.type)) {
                throw new Error(`Multiple serializers seen for type ${serializer.type}`);
            }
            serializerTypesSeen.set(serializer.type, true);
            if (_.difference(REQUIRED_SERIALIZER_PROPERTIES, Object.keys(serializer)).length !== 0) {
                throw new Error(`serializer ${index} must have the following properties: ${REQUIRED_SERIALIZER_PROPERTIES.join(",")}`);
            }
        });
    }

    _escapeSeparators(value) {
        var regex = new RegExp(escapeRegexp(this._separator), "g");
        return value.replace(regex, `${ESCAPE_CHAR}${this._separator}`);
    }

    findSerializerForValue(value) {
        return _.values(this._serializers).find((serializer) => {
            return serializer.isSerializable(value);
        });
    }

    _getComponentsFromSerializedString(value) {
        // The regex will split the value into an array of the following shape
        // [<component>, <non-escape char>, <component>, <non-escape char>, ..., <component>]
        // So go through the array and join each component with the following non-escaping char the regex captured.
        return value.split(this._nonEscapedSeparator)
        .reduce((result, item, i, array) => {
            if (i % 2 === 1) {
                return result.concat(`${array[i-1]}${array[i]}`);
            }
            else if (i === array.length - 1) {
                return result.concat(item);
            }
            else {
                return result;
            }
        }, [])
        .map((item) => {
            return item.replace(new RegExp(`${escapeRegexp(ESCAPE_CHAR)}${escapeRegexp(this._separator)}`, "g"), this._separator);
        });
    }
}

export default PluggableJSON;
