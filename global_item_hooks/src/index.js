import { getAutomaticFields } from '../../api';

export default async (
    { filter, schedule },
    { services, exceptions, database, getSchema }
) => {
    const { ItemsService, FieldsService } = services;
    const { InvalidPayloadException } = exceptions;
    const schema = await getSchema();
    filter(
        'items.update',
        itemUpdateFilter(FieldsService, InvalidPayloadException)
    );
    schedule(
        '0 0 * * *',
        cronUpdateCalcFields(ItemsService, FieldsService, database, schema)
    );
    // run updateFields when we start the server
    cronUpdateCalcFields(ItemsService, FieldsService, database, schema)();
};

function itemUpdateFilter(FieldsService) {
    return async (payload, { collection, keys }, { database, schema }) => {
        const automaticFields = await getAutomaticFields({
            FieldsService,
            database,
            schema,
            collection,
            type: 'automatic'
        });
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            await updateCalculationFieldsOnItem(
                database,
                collection,
                key,
                automaticFields
            );
        }
    };
}

async function updateCalculationFieldsOnItem(
    database,
    collection,
    keyOrItem,
    automaticFields
) {
    let item = keyOrItem;
    if (typeof keyOrItem !== 'object') {
        item = await database
            .select()
            .from(collection)
            .where({ id: keyOrItem })
            .first();
    }
    // this is a custom field that is used to store shared data between items
    const sharedItem = await database.select().from('shared_data').first();
    const fieldsToUpdate = {};
    for (let j = 0; j < automaticFields.length; j++) {
        const field = automaticFields[j];
        const fieldName = field.field;
        try {
            const customCode = field.meta.options.customCode;
            const customFunction = new Function(
                '$item',
                '$shared',
                `return (async () => {
                            ${customCode}
                        })();`
            );
            const out = await customFunction(item, sharedItem);
            if (out !== item[fieldName]) {
                fieldsToUpdate[fieldName] = out;
            }
        } catch (e) {
            item[fieldName] = 'error';
        }
    }
    if (Object.keys(fieldsToUpdate).length > 0) {
        await database(collection)
            .update(fieldsToUpdate)
            .where({ id: item.id });
    }
}

function cronUpdateCalcFields(FieldsService, database, schema) {
    return async () => {
        const collections = ['item'];
        console.log('Updating calculation fields...');
        const errors = [];
        for (let i = 0; i < collections.length; i++) {
            const collection = collections[i];
            const automaticFields = await getAutomaticFields({
                FieldsService,
                database,
                schema,
                collection,
                type: 'automatic'
            });
            const items = await database(collection).select();
            for (let j = 0; j < items.length; j++) {
                const item = items[j];
                try {
                    await updateCalculationFieldsOnItem(
                        database,
                        collection,
                        item,
                        automaticFields
                    );
                } catch (e) {
                    errors.push(item.id);
                }
            }
        }
        if (errors.length) {
            console.log('Errors on updating calculation fields:', errors);
        }
        console.log('⏱ Done updating. Time: ');
    };
}
