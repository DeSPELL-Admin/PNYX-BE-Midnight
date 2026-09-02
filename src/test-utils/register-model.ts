import { Connection, Model, Schema } from 'mongoose';

/**
 * Registers a schema on a test connection and returns the model.
 *
 * Several schemas (`EventLog`, `ReorgEventLog`, ...) `implements TypeEventLog`, which
 * trips the generic inference of `connection.model()`; registering untyped and
 * casting is the established workaround. Models whose collections are targeted by
 * a hard-coded `$lookup` (e.g. `Item` -> `items`) MUST be registered even when a
 * spec never queries them directly, or the lookup resolves against nothing.
 */
export function registerModel<TDoc>(
    connection: Connection,
    name: string,
    schema: Schema,
): Model<TDoc> {
    return connection.model(name, schema) as unknown as Model<TDoc>;
}
