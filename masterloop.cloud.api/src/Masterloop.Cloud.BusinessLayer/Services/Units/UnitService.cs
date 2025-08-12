using System;
using System.Collections.Generic;
using System.Reflection;
using Masterloop.Cloud.Core.Unit;
using Masterloop.Core.Units;
using Masterloop.Core.Units.Attributes;

namespace Masterloop.Cloud.BusinessLayer.Services.Units
{
    public class UnitService : IUnitService
    {
        public UnitTable GetUnitTable()
        {
            Assembly unitsAssembly = Assembly.Load("Masterloop.Core.Units");
            List<QuantityItem> quantityItems = new List<QuantityItem>();

            foreach (QuantityType quantityType in Enum.GetValues(typeof(QuantityType)))
            {
                int quantityId = (int)quantityType;
                string quantityName = Enum.GetName(typeof(QuantityType), quantityType);
                QuantityItem quantityItem = new QuantityItem()
                {
                    Id = quantityId,
                    Name = quantityName
                };

                string fullTypeName = $"Masterloop.Core.Units.{quantityName}Unit";
                Type unitType = unitsAssembly.GetType(fullTypeName);

                if (unitType != null)
                {
                    List<UnitItem> unitItems = new List<UnitItem>();
                    foreach (object unit in Enum.GetValues(unitType))
                    {
                        int unitId = (int)unit;
                        string unitName = Enum.GetName(unitType, unit);
                        string abbreviation = GetAbbreviation(unitType, unitName);
                        UnitItem unitItem = new UnitItem()
                        {
                            Id = unitId,
                            Name = unitName,
                            Abbreviation = abbreviation
                        };
                        unitItems.Add(unitItem);
                    }
                    quantityItem.Units = unitItems.ToArray();
                }
                quantityItems.Add(quantityItem);
            }

            UnitTable table = new UnitTable()
            {
                RevisionDate = DateTime.UtcNow,
                Quantities = quantityItems.ToArray()
            };
            return table;
        }

        private string GetAbbreviation(Type unitType, string unitName)
        {
            FieldInfo fieldInfo = unitType.GetField(unitName);
#nullable enable
            AbbreviationAttribute? Attribute = fieldInfo?.GetCustomAttribute(typeof(AbbreviationAttribute)) as AbbreviationAttribute;
#nullable disable

            return Attribute?.Name ?? String.Empty;
        }
    }
}
