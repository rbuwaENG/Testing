import { ColorGradient } from '../models';
var Color = require('color');

export class ColorGradientExtension {
  constructor() {
    throw new Error('Cannot new class');
  }

  public static pickColor(
    gradient: ColorGradient,
    valueRatioed0to1: number
  ): string {
    var index: number = gradient.rawArray.findIndex(
      (stopWithColor: [number, string]) => stopWithColor[0] >= valueRatioed0to1
    );
    var start: [number, string] = gradient.rawArray[index <= 0 ? 0 : index - 1];
    var end: [number, string] = gradient.rawArray[index];

    return Color(start[1])
      .mix(
        Color(end[1]),
        (valueRatioed0to1 - start[0]) / (end[0] - start[0]) || 0
      )
      .hex();
  }

  public static cropGradient(
    gradient: ColorGradient,
    start: number,
    end: number
  ): ColorGradient {
    var shouldReverse = end < start;
    if (shouldReverse) {
      start = start + end;
      end = start - end;
      start = start - end;
    }

    start = start < 0 ? 0 : start;
    end = end < start ? start : end > 1 ? 1 : end;

    let index = 0;
    let result = [];
    let tempGSR: any = {};
    let currentGSR: any = {};

    while (index < gradient.rawArray.length - 1) {
      index++;
      currentGSR = {
        start: gradient.rawArray[index - 1],
        end: gradient.rawArray[index],
      };
      /* if start is ahead of the range, skip to next range... */
      if (currentGSR.end[0] < start) {
        continue;
      }
      if (currentGSR.start[0] > end) {
        result.push([1, tempGSR.end[1]]);
        break;
      }

      tempGSR.start =
        currentGSR.start[0] >= start
          ? currentGSR.start
          : [
              start,
              Color(currentGSR.start[1])
                .mix(
                  Color(currentGSR.end[1]),
                  (start - currentGSR.start[0]) /
                    (currentGSR.end[0] - currentGSR.start[0]) || 0
                )
                .hex(),
            ];
      tempGSR.end =
        currentGSR.end[0] <= end
          ? currentGSR.end
          : [
              end,
              Color(currentGSR.start[1])
                .mix(
                  Color(currentGSR.end[1]),
                  (end - currentGSR.start[0]) /
                    (currentGSR.end[0] - currentGSR.start[0]) || 0
                )
                .hex(),
            ];

      var stopRatioedToStartEnd = !result.length
        ? 0
        : result[result.length - 1][0] +
          (tempGSR.start[0] - start) * (end - start);
      result.push([stopRatioedToStartEnd, tempGSR.start[1]]);
    }

    !shouldReverse
      ? result
      : result.reduce((result: any[], current, idx, source) => {
          result.splice(0, 0, [
            source[source.length - 1] - current[0],
            current[1],
          ]);
          return result;
        }, []);

    return ColorGradient.from(result);
  }
}
