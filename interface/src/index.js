import InterfaceComponent from './interface.vue';
import InterfaceCreator from './interface_creator.vue';

export default {
    id: 'calculation_interface',
    name: 'Calculation',
    description:
        'Here you can enter a custom code function. Be careful with this!',
    icon: 'code',
    component: InterfaceComponent,
    types: ['text', 'integer', 'float', 'string'],
    group: 'standard',
    options: InterfaceCreator
};
