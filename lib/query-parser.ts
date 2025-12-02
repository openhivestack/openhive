export interface QueryFilter {
  field: string;
  value: string;
  operator: 'includes' | 'equals' | 'has_skill';
}

export interface ParsedQuery {
  fieldFilters: QueryFilter[];
  generalFilters: {
    term: string;
    fields: string[];
  }[];
}

export class QueryParser {
  public parse(query: string): ParsedQuery {
    const result: ParsedQuery = {
      fieldFilters: [],
      generalFilters: [],
    };

    if (!query || query.trim() === '') {
      return result;
    }

    const parts = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    for (const part of parts) {
      let value = part;
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }

      if (part.includes(':')) {
        const [field, ...valueParts] = part.split(':');
        let fieldValue = valueParts.join(':');
        if (fieldValue.startsWith('"') && fieldValue.endsWith('"')) {
          fieldValue = fieldValue.substring(1, fieldValue.length - 1);
        }

        if (field && fieldValue) {
          if (field.toLowerCase() === 'skill') {
            result.fieldFilters.push({
              field: 'skills',
              value: fieldValue,
              operator: 'has_skill',
            });
          } else {
            result.fieldFilters.push({
              field,
              value: fieldValue,
              operator: 'includes',
            });
          }
        }
      } else {
        result.generalFilters.push({
          term: value,
          fields: ['name', 'description'],
        });
      }
    }

    return result;
  }
}