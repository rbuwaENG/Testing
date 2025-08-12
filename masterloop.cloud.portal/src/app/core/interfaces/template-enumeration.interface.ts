export interface EnumerationGroupDetails {
    Id: number,
    Name: string,
    Items: EnumerationItem[]
}

export interface EnumerationItem {
    Id: number,
    Name: string,
    UniqueId: string
}
