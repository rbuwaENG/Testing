import { Language } from './language';
import { dataTypesConst } from 'src/app/core/constants/dataType-constant';
import { DataType } from 'src/app/core/models/dataType';

export class Csharp implements Language {
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
      this.namespace = this.generateNamespace();
      this.content += this.namespace;
    }
    if (this.obervations) {
      this.content += this.generateObservationClassBlock();
      this.content += this.generateObservationConstants();
    }
    if (this.settings) {
      this.content += this.generateSettingsClassBlock();
      this.content += this.generateSettingsConstants();
    }
    if (this.pulses) {
      this.content += this.generatePulsesClassBlock();
      this.content += this.generatePulsesConstants();
    }
    if (this.commands) {
      this.content += this.generateCommandsClassBlock();
      this.content += this.generateCommandsConstants();
    }
    if (this.enumerationGroups) {
      this.content += this.generateEnumerationGroupsClassBlock();
      this.content += this.generateEnumerationGroups();
    }
    this.content += this.closingBracket();
  }

  generateHeader() {
    let headerInfo = '';
    headerInfo += '// Masterloop auto-generated template export.\n';
    headerInfo += `// Created at: ${new Date().toUTCString()}\n`;
    headerInfo += `// ${window.location.href}\n\n`;
    return headerInfo;
  }

  generateNamespace() {
    return `namespace Masterloop.${this.removeSpecialCharacters(
      this.TID
    )}.Constants\n{\n`;
  }

  /**
   * Remove special characters
   * @param str
   */

  removeSpecialCharacters(str: string) {
    var regExpr = /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi; ///[^a-zA-Z0-9.:*?""<>|;_=+{} ]/g;
    return str.replace(regExpr, ' ');
  }
  /**
   * Generate observations and class block
   */
  generateObservationClassBlock() {
    return '\tpublic class Observations\n\t{\n';
  }
  generateObservationConstants() {
    let observationBlockLines: string = '';
    this.obervations.forEach((observation) => {
      if (observation.Description == null) {
        observation.Description = '';
      }

      if (observation.Quantity === 1000) {
        if (this.enumerationGroups) {
          let enumerationGroup = this.enumerationGroups.find(
            (x) => x.Id === observation.Unit
          );

          let itemString: string = '';
          enumerationGroup.Items.forEach((item) => {
            itemString += `${item.Name}=${item.Id},`;
          });
          itemString = itemString.substring(0, itemString.length - 1);

          observationBlockLines += `\t\t/// ${
            observation.Description
          } [Enum: ${this.sanitizeValue(
            enumerationGroup.Name
          )} <see cref=\"EnumerationGroups.${this.sanitizeValue(
            enumerationGroup.Name
          )}\"/>]\n`;
        }
      } else {
        observationBlockLines += `\t\t/// ${
          observation.Description
        } [${this.getDataTypeName(observation.DataType)}]\n`;
      }

      observationBlockLines += `\t\tpublic const int ${this.sanitizeValue(
        observation.Name
      )} = ${observation.Id};\n`;
    });

    observationBlockLines += this.closingBracket(1);

    return observationBlockLines;
  }
  /**
   * Generate Settings and class block
   */
  generateSettingsClassBlock() {
    return '\tpublic class Settings\n\t{\n';
  }
  generateSettingsConstants() {
    let settingBlockLines: string = '';

    this.settings.forEach((setting) => {
      settingBlockLines += `\t\t/// ${this.sanitizeValue(
        setting.Name
      )} [${this.getDataTypeName(setting.DataType)}] \n`;
      settingBlockLines += `\t\tpublic const int ${this.sanitizeValue(
        setting.Name
      )} = ${setting.Id};\n`;
    });

    settingBlockLines += this.closingBracket(1);

    return settingBlockLines;
  }
  /**
   * Generate pulses and class block
   */
  generatePulsesClassBlock() {
    return '\tpublic class Pulses\n\t{\n';
  }
  generatePulsesConstants() {
    let pulsesBlockLines: string = '';

    this.pulses.forEach((pulse) => {
      if (pulse.Description == null) {
        pulse.Description = '';
      }
      pulsesBlockLines += `\t\t/// ${pulse.Description}\n`;
      pulsesBlockLines += `\t\tpublic const int ${this.sanitizeValue(
        pulse.Name
      )} = ${pulse.Id};\n`;
    });
    pulsesBlockLines += this.closingBracket(1);
    return pulsesBlockLines;
  }
  /**
   * Generate commands and class block
   */
  generateCommandsClassBlock() {
    return '\tpublic class Commands\n\t{\n';
  }

  generateCommandsConstants() {
    let commandBlockLines: string = '';
    this.commands.forEach((command) => {
      if (command.Description == null) {
        command.Description = '';
      }
      commandBlockLines += `\t\t/// ${command.Description}\n`;
      commandBlockLines += `\t\tpublic const int ${this.sanitizeValue(
        command.Name
      )} = ${command.Id};\n\n`;
      if (command.Arguments != null) {
        if (command.Arguments.length > 0) {
          commandBlockLines += `\t\tpublic static class ${this.sanitizeValue(
            command.Name
          )}Arguments\n\t\t{\n`;

          command.Arguments.forEach((argument) => {
            commandBlockLines += `\t\t\t///${argument.Name.trim()} [${this.getDataTypeName(
              argument.DataType
            )}]\n`;
            commandBlockLines += `\t\t\tpublic const int ${this.sanitizeValue(
              argument.Name
            )} = ${argument.Id};\n`;
          });

          commandBlockLines += this.closingBracket(2);
        }
      }
    });
    commandBlockLines += this.closingBracket(1);
    return commandBlockLines;
  }

  /**
   * Generate Enumeration Groups and enum block
   */

  generateEnumerationGroupsClassBlock() {
    return '\tpublic class Enums\n\t{\n';
  }

  generateEnumerationGroups() {
    let enumCodeblock: string = '';

    this.enumerationGroups.forEach((enumerationGroup) => {
      enumCodeblock =
        enumCodeblock +
        this.generateEnumerationGroupsConstants(enumerationGroup);
    });

    enumCodeblock += this.closingBracket(1);
    return enumCodeblock;
  }

  generateEnumerationGroupsConstants(enumerationGroup: any) {
    let enumClassCodeblock: string = '';

    enumClassCodeblock += `\t\tpublic enum ${enumerationGroup.Name}\n\t\t{\n`;

    enumerationGroup.Items.forEach((enumerationItem) => {
      enumClassCodeblock += `\t\t\t${this.sanitizeValue(
        enumerationItem.Name
      )} = ${enumerationItem.Id.toString()},\n`;
    });

    enumClassCodeblock += this.closingBracket(2);

    return enumClassCodeblock;
  }

  /**
   * Common method to place closing bracket
   */
  closingBracket(level = null): string {
    if (level == 1) {
      return '\t}\n\n';
    } else if (level == 2) {
      return '\t\t}\n\n';
    }
    return '}\n\n';
  }
  /**
   * Sanitize value
   */
  sanitizeValue(str: string) {
    str = str.trim();
    str = this.separateStringBySpaces(str);
    str = this.removeTrailingSpecialCharacterIfExists(str);
    //str = this.removeSpecialCharacters(str);
    str = this.convertToUpperCase(str);
    str = this.checkFirstCharacterIsNumericAndReplaceWithUnderscore(str);
    //str = this.removeEmptyElementsIfExists(str);
    //str = this.replaceCommaWithUnderscore(str);
    return str;
  }

  /**
   * Separate string by spaces
   * @param str
   */

  separateStringBySpaces(str) {
    let strArray = str.split(' ');
    return this.handleSpecialCharacters(strArray);
  }

  /**
   * Remove special characters in word parts after split by space
   * @param strArray
   */

  handleSpecialCharacters(strArray) {
    let regExpr = /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi;
    let finishedArray = [];
    for (let i = 0; i < strArray.length; i++) {
      var tra = strArray[i].replace(regExpr, '_');

      tra = tra.replace(/  +/g, '_');
      tra = tra.replace(/ /g, '_');
      tra = tra.replace(/__+/g, '_');
      if (tra != '') {
        // while(tra.charAt(0) === '_')
        //   {
        //    tra = tra.substring(1);
        //   }
        finishedArray.push(tra);
      }
    }
    return this.convertFirstLetterToUpperCase(finishedArray);
  }

  /**
   * Each word first letter converted to upper case
   * @param finishedArray
   */

  convertFirstLetterToUpperCase(finishedArray) {
    let finishedStr = '';
    for (let j = 0; j < finishedArray.length; j++) {
      finishedStr +=
        finishedArray[j].charAt(0).toUpperCase() +
        finishedArray[j].substr(1, finishedArray[j].length - 1);
    }

    return finishedStr;
  }

  /**
   * Remove trailing underscore if exists
   * @param str
   */
  removeTrailingSpecialCharacterIfExists(str) {
    if (str.endsWith('_')) {
      str = str.slice(0, -1);
    }
    str = str.replace(/__+/g, '_');
    return str;
  }

  convertToUpperCase(str) {
    let finalString = '';

    let words = str.split('_');

    for (let m = 0; m < words.length; m++) {
      words[m] = words[m][0].toUpperCase() + words[m].substr(1);
    }

    finalString = words.join('_');

    return finalString;
  }

  /**
   * Check first character is numeric, add underscore infront if yes
   * @param str
   */

  checkFirstCharacterIsNumericAndReplaceWithUnderscore(str) {
    let character = str.charAt(0);
    if (!isNaN(character)) {
      str = str.replace('', '_');
    }
    return str;
  }

  replaceSpacesWithUnderscore(str) {
    //let value = str.split(' ');
    let value = str.replace(' ', '_');
    return value;
  }

  /**
   * remove multiple words inside the brackets
   */

  removeMultipleWordsInsideBrackets(str: string) {
    var regExp = /\(([^)]+)\)/;
    var matches = regExp.exec(str);
    if (matches != null && matches[1].split(' ').length > 1)
      str = str.replace(/ \([^)]*\) /g, '');
    return str;
  }

  /**
   * Remove numbers and special characters from a string
   */
  removeLeadingNumbers(str: string) {
    return str.replace(/^[0-9]+/, '');
  }

  /**
   * Convert to camel case based on the first capital letter on each word
   * @param str
   */
  convertToCamelCaseWithUnderscore(str) {
    console.log('b4 conver', str);
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
  isUpperCase(str) {
    return str === str.toUpperCase();
  }
  /**
   * Convert first letter of each word to uppercase
   */
  convertUpperCase(str) {
    let data = '';
    if (str.includes(' ')) {
      str = str.split(' ');
      str.forEach(function (element) {
        data += element[0].toUpperCase() + element.substr(1);
      });
      return data;
    }
    return str;
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
    return 'CSharp';
  }
}
