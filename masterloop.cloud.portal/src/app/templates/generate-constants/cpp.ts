import { Language } from './language';
import { CFilePrefix } from '../../core/constants/c-file-prefix';
import { dataTypesConst } from 'src/app/core/constants/dataType-constant';
import { DataType } from 'src/app/core/models/dataType';

export class C implements Language {
  public content: any;
  private TID: any;
  protected namespace: any;
  protected templateDetails: any;
  protected obervations: any;
  protected settings: any;
  protected pulses: any;
  protected commands: any;
  protected commandArguments: any;
  protected enumerationGroups: any;

  public dataTypes: DataType[] = dataTypesConst;

  constructor(templateDetails) {
    this.TID = templateDetails['Id'];
    this.obervations = templateDetails['Observations'];
    this.settings = templateDetails['Settings'];
    this.commands = templateDetails['Commands'];
    this.pulses = templateDetails['Pulses'];
    this.enumerationGroups = templateDetails['EnumerationGroups'];
    if (this.TID != null) {
      this.content = this.generateHeader();
      this.content += this.generatePreProcessor();
    }
    if (this.obervations) {
      this.content += this.generateCommentHeader('Observation');
      this.content += this.generateObservationConstants();
    }
    if (this.settings) {
      this.content += this.generateCommentHeader('Settings');
      this.content += this.generateSettingsConstants();
    }
    if (this.pulses) {
      this.content += this.generateCommentHeader('Pulses');
      this.content += this.generatePulsesConstants();
    }
    if (this.commands) {
      this.content += this.generateCommentHeader('Commands');
      this.content += this.generateCommandsConstants();
    }
    if (this.enumerationGroups) {
      this.content += this.generateCommentHeader('Enums');
      this.content += this.generateEnumerationGroups();
    }
    this.content += this.generatePreProcessorEndTag();
  }
  /**
   * Generate header section
   */
  generateHeader() {
    let headerInfo = '';
    headerInfo += '// Masterloop auto-generated template export.\n';
    headerInfo += `// Created at: ${new Date().toUTCString()}\n`;
    headerInfo += `// ${window.location.href}\n\n`;
    return headerInfo;
  }

  /**
   * Generate pre processor
   */
  generatePreProcessor() {
    let preProcessor = '';
    preProcessor += `#ifndef _MASTERLOOP_${this.TID}_H\n`;
    preProcessor += `#define _MASTERLOOP_${this.TID}_H\n`;
    return preProcessor;
  }

  /**
   * Generate pre processor end tag
   */
  generatePreProcessorEndTag() {
    return '#endif';
  }

  /**
   * Generate comment header
   * @param sectionName
   */
  generateCommentHeader(sectionName) {
    let commentHeader = '';
    commentHeader += '\n/* \n';
    commentHeader += ` * ${sectionName} Section\n`;
    commentHeader += ' */ \n\n';
    return commentHeader;
  }

  /**
   * Generate observations define statments
   */
  generateObservationConstants() {
    let prefix = CFilePrefix.OBSERVATION_PREFIX;
    let observationBlockLines: string = '';

    this.obervations.forEach((observation) => {
      if (observation.Description == null) {
        observation.Description = '';
      }
      observationBlockLines += `#define ${prefix}_${this.sanitizeValue(
        observation.Name
      )}  ${observation.Id}`;
      observationBlockLines += ` // ${
        observation.Description
      } [${this.getDataTypeName(observation.DataType)}]\n`;
    });
    observationBlockLines += '\n';
    return observationBlockLines;
  }

  /**
   * Generate settings define statments
   */
  generateSettingsConstants() {
    let prefix = CFilePrefix.SETTINGS_PREFIX;
    let settingBlockLines: string = '';

    this.settings.forEach((setting) => {
      if (setting.Description == null) {
        setting.Description = '';
      }

      settingBlockLines += `#define ${prefix}_${this.sanitizeValue(
        setting.Name
      )}  ${setting.Id}`;
      settingBlockLines += ` // ${setting.Description} [${this.getDataTypeName(
        setting.DataType
      )}]\n`;
    });
    settingBlockLines += '\n';
    return settingBlockLines;
  }

  /**
   * Generate pulses define statments
   */
  generatePulsesConstants() {
    let prefix = CFilePrefix.PULSES_PREFIX;
    let pulsesBlockLines: string = '';

    this.pulses.forEach((pulse) => {
      if (pulse.Description == null) {
        pulse.Description = '';
      }
      pulsesBlockLines += `#define ${prefix}_${this.sanitizeValue(
        pulse.Name
      )}  ${pulse.Id}`;
      pulsesBlockLines += ` // ${pulse.Description} [${this.getDataTypeName(
        pulse.DataType
      )}]\n`;
    });
    pulsesBlockLines += '\n';
    return pulsesBlockLines;
  }

  /**
   * Generate commands and arguments define statments
   */
  generateCommandsConstants() {
    let prefix = CFilePrefix.COMMAND_PREFIX;
    let commandBlockLines: string = '';

    this.commands.forEach((command) => {
      if (command.Description == null) {
        command.Description = '';
      }
      commandBlockLines += `#define ${prefix}_${this.sanitizeValue(
        command.Name
      )}  ${command.Id}`;
      commandBlockLines += ` // ${command.Description} [${this.getDataTypeName(
        command.DataType
      )}]\n`;

      //Handling command arguments
      if (command.Arguments != null) {
        if (command.Arguments.length > 0) {
          command.Arguments.forEach((argument, argumentIndex) => {
            commandBlockLines += `#define ${prefix}_${this.sanitizeValue(
              command.Name
            )}${CFilePrefix.ARGUMENT_PREFIX}${this.sanitizeValue(
              argument.Name
            )} ${argument.Id}`;
            commandBlockLines += ` //${argument.Name.trim()} [${this.getDataTypeName(
              argument.DataType
            )}]\n`;
          });
        }
      }
    });
    commandBlockLines += '\n';
    return commandBlockLines;
  }

  /**
   * Generate Enumeration Groups and enum block
   */
  generateEnumerationGroups() {
    let enumCodeblock: string = '';

    this.enumerationGroups.forEach((enumerationGroup) => {
      enumCodeblock =
        enumCodeblock +
        this.generateEnumerationGroupsConstants(enumerationGroup);
    });

    return enumCodeblock;
  }

  generateEnumerationGroupsConstants(enumerationGroup: any) {
    let prefix = CFilePrefix.ENUMERATION_PREFIX;
    let enumClassCodeblock: string = '';

    enumerationGroup.Items.forEach((enumerationItem) => {
      enumClassCodeblock += `#define ${prefix}_${this.sanitizeValue(
        enumerationGroup.Name
      )}_${this.sanitizeValue(enumerationItem.Name)}  ${enumerationItem.Id}`;
      enumClassCodeblock += ` // ${enumerationGroup.Name} ${enumerationItem.Name} [Enum]\n`;
    });

    enumClassCodeblock += '\n';
    return enumClassCodeblock;
  }

  /**
   * Sanitize value
   */
  sanitizeValue(str: string) {
    str = str.trim();
    str = this.removeLeadingNumbers(str);
    str = this.removeSpecialCharacters(str);
    str = this.replaceSpaceWithSpecialCharacter(str);
    str = this.convertToCamelCaseWithUnderscore(str);
    return str;
  }

  // remove multiple words inside the brackets
  removeMultipleWordsInsideBrackets(str: string) {
    var regExp = /\(([^)]+)\)/;
    var matches = regExp.exec(str);
    if (matches != null && matches[1].split(' ').length > 1)
      str = str.replace(/ *\([^)]*\) */g, '');
    return str;
  }

  /**
   * Remove numbers and special characters from a string
   */
  removeLeadingNumbers(str: string) {
    return str.replace(/^[0-9]+/, '');
  }
  removeSpecialCharacters(str: string) {
    // var regExpr = /[^a-zA-Z0-9-.:*?""<>|;_=+{} ]/g;
    var regExpr = /[`~!@#$%^&*()|+\-=?;:'",.<>\{\}\[\]\\\/]/gi;
    return str.replace(regExpr, '');
  }
  /**
   * Convert each word to uppercase and add trailing underscore
   */
  convertUpperCase(str) {
    let data = '';
    if (str.includes(' ')) {
      str = str.split(' ');
      str.forEach(function (element) {
        data += `${element.toUpperCase()}_`;
      });
      return data.slice(0, -1);
    }
    return str.toUpperCase();
  }

  replaceSpaceWithSpecialCharacter(str) {
    str = str.replace(/ /g, '*');
    return str;
  }

  isUpperCase(str) {
    return str === str.toUpperCase();
  }
  /**
   * Convert to camel case based on the first capital letter on each word
   * @param str
   */
  convertToCamelCaseWithUnderscore(str) {
    let data = '';
    if (!this.isUpperCase(str)) {
      str = str.split(/(?=[A-Z])/);
      str.forEach(function (element) {
        if (element.length > 1) {
          data += `${element.toUpperCase()}_`;
        } else {
          if (element != element.toUpperCase()) {
            data += `${element.toUpperCase()}_`;
          } else {
            data += `${element.toUpperCase()}`;
          }
        }
      });
    } else {
      data = str.toUpperCase();
    }
    if (data.endsWith('_')) {
      data = data.slice(0, -1);
    }
    data = data.replace(/[^A-Z0-9]+/gi, '_');
    return data;
  }
  /**
   * Remove space
   */
  removeSpace(str: string) {
    return str.replace(/(^[0-9])|(^[a-z])|(s+[a-z])/g, (txt) =>
      txt.toUpperCase()
    );
    //return str.replace(/\s/g, '');
  }
  /**
   * Return relavent data type
   */
  getDataTypeName(value) {
    let selectedDataType;
    this.dataTypes.forEach((item) => {
      if (item.Id == value) {
        selectedDataType = item.Name;
      }
    });
    return selectedDataType;
  }

  getName(): string {
    return 'Cpp';
  }
}
