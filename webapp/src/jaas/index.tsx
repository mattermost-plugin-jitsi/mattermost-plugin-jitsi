import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import store from './reducers/store';
import JaaSConference from '../jaas/components/conference';

function JaaSRoot() {
    return (<JaaSConference/>);
}

ReactDOM.render(<Provider store={store}>
    <JaaSRoot/>
</Provider>, document.getElementById('jaas-root'));