import json
import os

def filter_people_fields(people_data):
    """Filter people.json to only include specified fields within the 'fields' property"""
    filtered_people = []
    
    for person in people_data:
        filtered_person = {
            "fields": {}
        }
        
        # Only keep specified fields from the 'fields' property if they exist
        if "fields" in person:
            for field in ['personID', 'name', 'memberOf', 'personLookup']:
                if field in person["fields"]:
                    filtered_person["fields"][field] = person["fields"][field]
        
        filtered_people.append(filtered_person)
    
    return filtered_people

def filter_groups_fields(groups_data):
    """Filter peopleGroups.json to only include groupName field within the 'fields' property"""
    filtered_groups = []
    
    for group in groups_data:
        filtered_group = {
            "id": group.get("id"),
            "fields": {}
        }
        
        # Only keep groupName field from the 'fields' property if it exists
        if "fields" in group and "groupName" in group["fields"]:
            filtered_group["fields"]["groupName"] = group["fields"]["groupName"]
        
        filtered_groups.append(filtered_group)
    
    return filtered_groups

def main():
    # Define input and output paths
    input_people = 'src/data/people.json'
    input_groups = 'src/data/peopleGroups.json'
    output_people = 'src/data/people_filtered.json'
    output_groups = 'src/data/peopleGroups_filtered.json'
    
    try:
        # Process people.json
        if os.path.exists(input_people):
            with open(input_people, 'r', encoding='utf-8') as f:
                people_data = json.load(f)
            
            filtered_people = filter_people_fields(people_data)
            
            with open(output_people, 'w', encoding='utf-8') as f:
                json.dump(filtered_people, f, indent=2, ensure_ascii=False)
            
            print(f"Filtered people.json saved to {output_people}")
        else:
            print(f"File not found: {input_people}")
        
        # Process peopleGroups.json
        if os.path.exists(input_groups):
            with open(input_groups, 'r', encoding='utf-8') as f:
                groups_data = json.load(f)
            
            filtered_groups = filter_groups_fields(groups_data)
            
            with open(output_groups, 'w', encoding='utf-8') as f:
                json.dump(filtered_groups, f, indent=2, ensure_ascii=False)
            
            print(f"Filtered peopleGroups.json saved to {output_groups}")
        else:
            print(f"File not found: {input_groups}")
            
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()