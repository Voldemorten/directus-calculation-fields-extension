<template>
    <div>
        <div class="demoIdContainer">
            <label for="demoId">Demo id</label>
            <div class="demoIdInput">
                <v-input
                    id="demoId"
                    :modelValue="demoId"
                    hideArrows="true"
                    type="number"
                    @input="demoIdChanged($event)"
                ></v-input>
                <v-button
                    :style="{ marginLeft: '1em' }"
                    @click="handleDemoIdFetch()"
                    :disabled="!demoId"
                    >Fetch {{ demoId || '' }}</v-button
                >
            </div>
            <div>{{ itemFetchedText }}</div>
        </div>
        <span
            >You can use $item to access the actual item. I.e.
            console.log($item.id) and $shared to access shared data</span
        >
        <interface-input-code
            :value="value.customCode"
            language="javascript"
            :lineWrapping="true"
            @input="handleInput($event)"
        ></interface-input-code>
        <div :style="{ marginBottom: '1em' }">{{ output }}</div>
        <v-checkbox
            label="Automatic calculation"
            :modelValue="value.automaticCalculation"
            @update:modelValue="handleAutomaticCalculationUpdate($event)"
        />
    </div>
</template>

<script>
import { useApi, useStores } from '@directus/extensions-sdk';
import { ref, reactive } from 'vue';

export default {
    props: {
        value: {
            type: Object
        }
    },
    emits: ['input'],
    setup(props, { emit }) {
        let timeout;
        props.value.automaticCalculation =
            props.value.automaticCalculation || false;
        const collectionName = location.href.match(/data-model\/(.*)\//m)[1];
        const api = useApi();
        let demoId = ref(0);
        const item = reactive({});
        const sharedItem = reactive({});
        const itemFetchedText = ref('No item fetched yet.');
        handleDemoIdFetch();
        const output = ref('output');
        return {
            handleInput,
            output,
            demoId,
            demoIdChanged,
            handleDemoIdFetch,
            item,
            itemFetchedText,
            handleAutomaticCalculationUpdate
        };

        function handleInput(value) {
            clearTimeout(timeout);
            timeout = setTimeout(async function () {
                try {
                    props.value.customCode = value;
                    const customFunction = new Function(
                        '$item',
                        '$shared',
                        `return (async () => {
                            ${props.value.customCode}
                        })();`
                    );
                    output.value = await customFunction(
                        item.value,
                        sharedItem.value
                    );
                    emit('input', props.value);
                } catch (e) {
                    output.value = 'Not valid js. See console for details.';
                    console.log(e);
                }
            }, 1000);
        }

        function demoIdChanged(event) {
            demoId.value = +event.target.value;
        }

        async function handleDemoIdFetch() {
            try {
                sharedItem.value = (
                    await api.get(`/items/shared_data/1`)
                ).data.data;
                if (demoId.value === 0) {
                    const url = `/items/${collectionName}?fields=*.*&limit=1`;
                    const items = (await api.get(url)).data.data;
                    item.value = items[0];
                    demoId.value = item.value.id;
                } else {
                    const url = `/items/${collectionName}/${demoId.value}?fields=*.*`;
                    const data = (await api.get(url)).data.data;
                    item.value = data;
                }
                console.log({ item: item.value, shared: sharedItem.value });
                itemFetchedText.value = `Item ${demoId.value} fetched. Inspect console to see it.`;
            } catch (e) {
                itemFetchedText.value = `ERROR WITH FETCHING ITEM: ${e}`;
            }
        }

        function handleAutomaticCalculationUpdate(status) {
            props.value.automaticCalculation = status;
            emit('input', props.value);
        }
    }
};
</script>

<style scoped>
.demoIdContainer {
    display: flex;
    flex-direction: column;
    margin-bottom: 1em;
}

.demoIdInput {
    display: flex;
}
</style>
