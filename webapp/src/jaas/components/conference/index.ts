import {connect} from 'react-redux';
import {JaaSConference, MapDispatchToProps, MapStateToProps} from './jaas_conference';

export default connect(MapStateToProps, MapDispatchToProps)(JaaSConference);