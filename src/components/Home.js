import React from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

const Home = props =>
  <div className="home">
    <div>
      <h1 itemProp="headline">ServiceNow video chat</h1>
      <p>Please enter a room name.</p>
      <input type="text" name="room" value={ props.roomId } onChange={props.handleChange} pattern="^\w+$" maxLength="10" required autoFocus title="Room name should only contain letters or numbers."/>
      <Link className="primary-button" to={ '/r/' + props.roomId }>Join</Link>
      <Link className="primary-button" to={ '/r/' + props.defaultRoomId }>Random</Link>
      { props.rooms.length !== 0 && <div>Recently used rooms:</div> }
      { props.rooms.map(room => <Link key={room} className="recent-room" to={ '/r/' + room }>{ room }</Link>) }
    </div>
  </div>;

Home.propTypes = {
  handleChange: PropTypes.func.isRequired,
  defaultRoomId: PropTypes.string.isRequired,
  roomId: PropTypes.string.isRequired,
  rooms: PropTypes.array.isRequired
};

const mapStateToProps = store => ({rooms: store.rooms});

export default connect(mapStateToProps)(Home);

class ScreenSharing extends LitElement {
  constructor() {
    super();
    this.enableStartCapture = true;
    this.enableStopCapture = false;
    this.enableDownloadRecording = false;
    this.stream = null;
    this.chunks = [];
    this.mediaRecorder = null;
    this.status = 'Inactive';
    this.recording = null;
  }

  static get properties() {
    return {
      status: String,
      enableStartCapture: Boolean,
      enableStopCapture: Boolean,
      enableDownloadRecording: Boolean,
      recording: {
        type: {
          fromAttribute: input => input
        }
      }
    };
  }

  render() {
    return html`<style>
@import "../../../css/main.css";
:host {
  display: block;
  padding: 10px;
  width: 100%;
  height: 100%;
}
video {
    --video-width: 100%;
    width: var(--video-width);
    height: calc(var(--video-width) * (16 / 9));
}
</style>
<video ?controls="${this.recording !== null}" playsinline autoplay loop muted .src="${this.recording}"></video>
<div>
<p>Status: ${this.status}</p>
<button ?disabled="${!this.enableStartCapture}" @click="${e => this._startCapturing(e)}">Start screen capture</button>
<button ?disabled="${!this.enableStopCapture}" @click="${e => this._stopCapturing(e)}">Stop screen capture</button>
<button ?disabled="${!this.enableDownloadRecording}" @click="${e => this._downloadRecording(e)}">Download recording</button>
<a id="downloadLink" type="video/webm" style="display: none"></a>
</div>`;
  }

  static _startScreenCapture() {
    if (navigator.getDisplayMedia) {
      return navigator.getDisplayMedia({video: true});
    } else if (navigator.mediaDevices.getDisplayMedia) {
      return navigator.mediaDevices.getDisplayMedia({video: true});
    } else {
      return navigator.mediaDevices.getUserMedia({video: {mediaSource: 'screen'}});
    }
  }

  async _startCapturing(e) {
    console.log('Start capturing.');
    this.status = 'Screen recording started.';
    this.enableStartCapture = false;
    this.enableStopCapture = true;
    this.enableDownloadRecording = false;
    this.requestUpdate('buttons');

    if (this.recording) {
      window.URL.revokeObjectURL(this.recording);
    }

    this.chunks = [];
    this.recording = null;
    this.stream = await ScreenSharing._startScreenCapture();
    this.stream.addEventListener('inactive', e => {
      console.log('Capture stream inactive - stop recording!');
      this._stopCapturing(e);
    });
    this.mediaRecorder = new MediaRecorder(this.stream, {mimeType: 'video/webm'});
    this.mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });
    this.mediaRecorder.start(10);
  }

  _stopCapturing(e) {
    console.log('Stop capturing.');
    this.status = 'Screen recorded completed.';
    this.enableStartCapture = true;
    this.enableStopCapture = false;
    this.enableDownloadRecording = true;

    this.mediaRecorder.stop();
    this.mediaRecorder = null;
    this.stream.getTracks().forEach(track => track.stop());
    this.stream = null;

    this.recording = window.URL.createObjectURL(new Blob(this.chunks, {type: 'video/webm'}));
  }

  _downloadRecording(e) {
    console.log('Download recording.');
    this.enableStartCapture = true;
    this.enableStopCapture = false;
    this.enableDownloadRecording = false;

    const downloadLink = this.shadowRoot.querySelector('a#downloadLink');
    downloadLink.addEventListener('progress', e => console.log(e));
    downloadLink.href = this.recording;
    downloadLink.download = 'screen-recording.webm';
    downloadLink.click();
  }
}

customElements.define('screen-sharing', ScreenSharing);