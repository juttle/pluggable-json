import _ from "underscore";
import escapeRegexp from "escape-regexp";

const ESCAPE_CHAR = "^";

const REQUIRED_SERIALIZER_PROPERTIES = ["type", "isSerializable", "serialize", "deserialize"];

class PluggableJSON {
    constructor(serializers = [], separator = "$") {
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
            // returns <separator><serializer.type><separator><serialized value>
            return this._separator + this._escapeSeparators(serializer.type) +
                   this._separator + this._escapeSeparators(serializer.serialize(value));
        }
        else if (_.isArray(value)) {
            return value.map((item) => {
                return this._serialize(item);
            });
        }
        else if (_.isObject(value)) {
            return _.mapObject(value, (propertyValue) => {
                return this._serialize(propertyValue);
            });
        }
        else if (_.isString(value)){
            return this._escapeSeparators(value);
        }
        else {
            return value;
        }
    }

    _deserialize(value) {
        if (_.isString(value)) {
            let serializedComponents = this._getComponentsFromSerializedString(value);
            if (serializedComponents.type === null) {
                return serializedComponents.value;
            }
            else {
                return this._serializers[serializedComponents.type].deserialize(serializedComponents.value);
            }
        }
        else if(_.isArray(value)) {
            return value.map((item) => {
                return this._deserialize(item);
            });
        }
        else if (_.isObject(value)) {
            return _.mapObject(value, (propertyValue) => {
                return this._deserialize(propertyValue);
            });
        }
        else {
            return value;
        }
    }

    deserialize(value) {
        return this._deserialize(_.isObject(value) ? value : JSON.parse(value));
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

    _unescapeSeparators(value) {
        return value.replace(new RegExp(`${escapeRegexp(ESCAPE_CHAR)}${escapeRegexp(this._separator)}`, "g"), this._separator);
    }

    findSerializerForValue(value) {
        return _.find(_.values(this._serializers), (serializer) => {
            return serializer.isSerializable(value);
        });
    }

    _getComponentsFromSerializedString(value) {
        // If the value doesn't start with a separator,
        // it is not serialized by one of the serializers
        // so return without deserializing.
        if (value.charAt(0) !== this._separator) {
            return {
                type: null,
                value: this._unescapeSeparators(value)
            };
        }

        // Find the index of the seaprator that separates
        // the serializer type from the serialized value.
        // + 1 because the returned index of `value.search`
        // is the location of the non-escaping character
        // before the separator we found.
        let separatorIndex = value.search(this._nonEscapedSeparator) + 1;

        return {
            // Start at 1 to ignore the separator at the start of the value.
            type: this._unescapeSeparators(value.substring(1, separatorIndex)),
            // + 1 to ignore the separator itself
            value: this._unescapeSeparators(value.substring(separatorIndex + 1))
        };
    }
}

export default PluggableJSON;
