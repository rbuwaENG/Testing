import { DeviceActivityColors } from '../constants/device-activity-colors';

export class DeviceStatusColorGenerator {
  constructor() {
    throw new Error('Cannot new this class');
  }

  public static getColorCode(pulseTime = null, timeFormat = 'hours'): string {
    let color = DeviceActivityColors.GRAY;
    if (timeFormat == 'hours') {
      if (pulseTime != null) {
        if (pulseTime > 24) {
          color = DeviceActivityColors.RED;
        } else if (pulseTime == '') {
          color = DeviceActivityColors.GRAY;
        } else if (pulseTime <= 2) {
          color = DeviceActivityColors.GREEN;
        } else if (pulseTime > 2 && pulseTime <= 24) {
          color = DeviceActivityColors.AMBER;
        } else {
          color = DeviceActivityColors.GRAY;
        }
      }
    } else {
      if (pulseTime != null) {
        var timeDiffMilliseconds =
          new Date().getTime() - new Date(pulseTime).getTime();

        var diffHours = Math.round(timeDiffMilliseconds / (1000 * 3600));
        var diffDays = Math.round(diffHours / 24);

        if (diffDays > 1) {
          color = DeviceActivityColors.RED;
        } else if (diffHours <= 2) {
          color = DeviceActivityColors.GREEN;
        } else if (diffHours > 2 && diffDays <= 1) {
          color = DeviceActivityColors.AMBER;
        } else {
          console.log(pulseTime);
        }
      }
    }
    return color;
  }
}
