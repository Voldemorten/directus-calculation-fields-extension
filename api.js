async function getAutomaticFields({
    FieldsService,
    database,
    schema,
    collection,
    type = 'all'
} = {}) {
    const validTypes = ['all', 'automatic', 'manual'];
    if (!validTypes.includes(type)) {
        throw Error(
            `type ${type} isn't allowed. Valid types: ${validTypes.join(' ')}`
        );
    }
    const goldFieldsService = new FieldsService({
        knex: database,
        schema
    });
    const fields = await goldFieldsService.readAll(collection);
    const automaticFields = fields.filter(
        (field) => field.meta.interface === 'calculation_interface'
    );

    // some calculations are dependent on other fields, so we need to make sure that independant fields are calculated first
    const firstFields = ['custom_mapping'];
    const sorted = automaticFields.sort((a, b) => {
        if (firstFields.includes(a.field)) return -1;
    });

    if (type === 'automatic') {
        return sorted.filter(
            (field) => field.meta.options.automaticCalculation
        );
    } else if (type === 'manual') {
        return sorted.filter(
            (field) => !field.meta.options.automaticCalculation
        );
    }
    return sorted;
}

async function setCalculationFieldsValues({
    automaticFields,
    payload,
    item,
    sharedItem
} = {}) {
    for (let j = 0; j < automaticFields.length; j++) {
        const field = automaticFields[j];
        const fieldName = field.field;
        // eslint-disable-next-line no-prototype-builtins
        if (payload.hasOwnProperty(fieldName)) {
            const payloadFieldValue = payload[fieldName];
            if (
                !field.meta.options.automaticCalculation &&
                (payloadFieldValue === null ||
                    payloadFieldValue === undefined ||
                    `${payloadFieldValue}`.includes('null') ||
                    `${payloadFieldValue}`.includes('undefined'))
            ) {
                try {
                    const customCode = field.meta.options.customCode;
                    const customFunction = new Function(
                        '$item',
                        '$shared',
                        `return (async () => {
                            ${customCode}
                        })();`
                    );
                    const out = await customFunction(
                        item || {},
                        sharedItem || {}
                    );
                    item[fieldName] = out;
                    payload[fieldName] = out;
                } catch (e) {
                    console.log(`error in calculation field ${fieldName}`);
                    payload[fieldName] = 'error';
                }
            }
        }
    }
}

export { getAutomaticFields, setCalculationFieldsValues };
