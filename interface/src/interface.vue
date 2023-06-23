<template>
    <div>
        <div :style="{ display: 'flex', flexDirection: 'column' }">
            <div v-if="type === 'text' || type === 'string'">
                <interface-input-multiline
                    v-if="type === 'text'"
                    :disabled="automaticCalculation"
                    :value="value"
                    @input="handleInput($event)"
                />
                <interface-input
                    v-if="type === 'string'"
                    :disabled="automaticCalculation"
                    :value="value"
                    @input="handleInput($event)"
                />
                <div
                    :style="{ margin: '1em 0 1em auto' }"
                    v-if="!automaticCalculation"
                >
                    <v-button
                        :disabled="!item"
                        :style="{ marginRight: '1em' }"
                        @click="handleUpdate()"
                        v-show="!hideCalculation"
                    >
                        {{ item ? 'Copy &uarr;' : 'Couldn’t fecth item' }}
                    </v-button>
                    <v-button @click="handleShowCode()">
                        {{
                            hideCalculation
                                ? 'Show calculation'
                                : 'Hide calculation'
                        }}
                    </v-button>
                </div>
                <div
                    :style="{ display: 'flex' }"
                    class="flex-children"
                    v-show="!hideCalculation"
                >
                    <!-- <interface-input-code
                    :value="customCode"
                    language="javascript"
                    disabled="true"
                /> -->
                    <interface-input-multiline
                        :disabled="true"
                        :value="calculatedCode"
                    />
                </div>
            </div>
            <div v-if="type === 'integer'">
                <interface-input
                    :disabled="automaticCalculation"
                    :value="value"
                    type="integer"
                    @input="handleInput($event)"
                />
            </div>
            <div v-if="type === 'float'">
                <interface-input
                    :disabled="automaticCalculation"
                    :value="value"
                    type="float"
                    @input="handleInput($event)"
                />
            </div>
        </div>
    </div>
</template>

<script>
import { useApi, useStores } from '@directus/extensions-sdk';
import { watchEffect } from 'vue';
import { ref, reactive } from 'vue';

export default {
    props: {
        value: {
            type: String,
            default: null
        },
        customCode: {
            type: String,
            default: null
        },
        primaryKey: {
            type: String,
            default: null
        },
        automaticCalculation: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            default: null
        }
    },
    emits: ['input'],
    setup(props, { emit }) {
        const hideCalculation = ref(true);
        let item = reactive({});
        let calculatedCode = ref('calculated');
        const api = useApi();
        const collectionName = location.href.match(/content\/(.*)\//m)?.[1];
        watchEffect(() => {
            if (collectionName && props.automaticCalculation === false) {
                const url = `/items/${collectionName}/${props.primaryKey}`;
                api.get(url).then((fetchedItem) => {
                    item = fetchedItem.data.data;
                    api.get(`/items/shared_data/1`).then(
                        async (fetchedSharedItem) => {
                            const sharedItem = fetchedSharedItem.data.data;
                            calculatedCode.value = await calculateCode(
                                item,
                                sharedItem
                            );
                        }
                    );
                });
            }
        });

        return {
            handleUpdate,
            handleInput,
            handleShowCode,
            hideCalculation,
            item,
            calculatedCode
        };

        function handleInput(value) {
            props.value = value;
            emit('input', props.value);
        }

        function handleUpdate() {
            try {
                props.value = calculatedCode.value;
                emit('input', props.value);
            } catch (e) {
                console.log(e);
            }
        }

        function handleShowCode() {
            hideCalculation.value = !hideCalculation.value;
        }

        async function calculateCode(fetchedItem, sharedItem) {
            try {
                const customFunction = new Function(
                    '$item',
                    '$shared',
                    `return (async () => {
                            ${props.value.customCode}
                        })();`
                );
                const out = await customFunction(
                    fetchedItem || item,
                    sharedItem || {}
                );
                return out;
            } catch (e) {
                console.log(e);
                return `Error: ${e.message}`;
            }
        }
    }
};
</script>

<style scoped>
.button {
    position: relative;
    display: flex;
    align-items: center;
    width: var(--v-button-width);
    min-width: var(--v-button-min-width);
    height: var(--v-button-height);
    padding: 0 19px;
    color: var(--v-button-color);
    font-weight: var(--v-button-font-weight);
    font-size: var(--v-button-font-size);
    line-height: var(--v-button-line-height);
    text-decoration: none;
    background-color: var(--v-button-background-color);
    border: var(--border-width) solid var(--v-button-background-color);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: var(--fast) var(--transition);
    transition-property: background-color border;
}

.button:disabled {
    color: var(--v-button-color-disabled);
    background-color: var(--v-button-background-color-disabled);
    border: var(--border-width) solid var(--v-button-background-color-disabled);
    cursor: not-allowed;
}
.button:focus:not(:disabled),
.button:hover:not(:disabled) {
    color: var(--v-button-color-hover);
    background-color: var(--v-button-background-color-hover);
    border-color: var(--v-button-background-color-hover);
}

.flex-children > * {
    flex: 1;
}
</style>
