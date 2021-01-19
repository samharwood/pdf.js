/* Copyright 2020 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BaseTreeViewer } from "./base_tree_viewer.js";

/**
 * @typedef {Object} PDFTTSViewerOptions
 * @property {HTMLDivElement} container - The viewer element.
 * @property {EventBus} eventBus - The application event bus.
 * @property {IL10n} l10n - Localization service.
 */

/**
 * @typedef {Object} PDFTTSViewerRenderParameters
 * @property {OptionalContentConfig|null} optionalContentConfig - An
 *   {OptionalContentConfig} instance.
 * @property {PDFDocument} pdfDocument - A {PDFDocument} instance.
 */

class PDFTTSViewer extends BaseTreeViewer {
  constructor(options) {
    super(options);
    this.l10n = options.l10n;
  }

  reset() {
    super.reset();
    this._optionalContentConfig = null;
  }

  /**
   * @private
   */
  _dispatchEvent(ttsAvailable) {
    this.eventBus.dispatch("ttsloaded", {
      source: this,
      ttsAvailable,
    });
  }

  get isTTSAvailable() {
    return ('speechSynthesis' in window);
  }

  /**
   * @param {PDFTTSViewerRenderParameters} params
   */
  render({ optionalContentConfig }) {
    if (this._optionalContentConfig) {
      this.reset();
    }
    this._optionalContentConfig = optionalContentConfig || null;

    if (!this.isTTSAvailable) {
      this._dispatchEvent(0);
      return;
    }

    const fragment = document.createDocumentFragment();
    const div = document.createElement("div");
    div.className = "treeItem";

    const voiceslabel = document.createElement("label");
    voiceslabel.textContent = "Choose voice"
    div.appendChild(voiceslabel);

    const voicelist = document.createElement("select");
    voicelist.id = "voiceSelect";
    this.loadVoices(voicelist);
    div.appendChild(voicelist);

    fragment.appendChild(div);
    this._finishRendering(fragment, 1);
  }


  async loadVoices(voicelist) {
    // Get Voices as promise to allow time to load.
    const allVoicesObtained = new Promise(function(resolve, reject) {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length !== 0) {
        resolve(voices);
      } else {
        window.speechSynthesis.addEventListener("voiceschanged", function() {
          voices = window.speechSynthesis.getVoices();
          resolve(voices);
        });
      }
    });
    // When promise resolved, add to voice list.
    await allVoicesObtained.then(voices => {
      voices.forEach(function (voice) {
        let option = document.createElement("option");
        option.textContent = voice.name + (voice.default ? ' (default)' : '');
        voicelist.appendChild(option);
      });
      // Load preference
      voicelist.selectedIndex = localStorage['PDFJS_TTS_Voice'];
      // Save preference
      voicelist.onchange = function () {
        localStorage['PDFJS_TTS_Voice'] = this.selectedIndex;
      }
    });
  }



  speak() {
    const text = window.getSelection().toString();
    let msg = new SpeechSynthesisUtterance();
    const voices = window.speechSynthesis.getVoices();
    const voicechoice = document.getElementById('voiceSelect')
    msg.voice = voices[voicechoice.selectedIndex];
    //msg.rate = 1;
    // msg.rate = $('#rate').val() / 10;
    //msg.pitch = 1;
    // msg.pitch = $('#pitch').val();
    msg.text = text;
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
  }

  /**
   * @private
   */
  async _resetTTS() {
    if (!this._optionalContentConfig) {
      return;
    }
    // Fetch the default optional content configuration...
    const optionalContentConfig = await this._pdfDocument.getOptionalContentConfig();

    this.eventBus.dispatch("optionalcontentconfig", {
      source: this,
      promise: Promise.resolve(optionalContentConfig),
    });

    // ... and reset the sidebarView to the default state.
    this.render({
      optionalContentConfig
    });
  }
}

export { PDFTTSViewer };
