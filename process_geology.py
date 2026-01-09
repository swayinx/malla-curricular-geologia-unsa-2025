
import json
import re

def parse_curriculum(filename):
    courses = []
    current_year = ""
    current_sem = ""
    
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    processed_lines = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if "AÑO" in line or "SEMESTRE" in line:
            processed_lines.append(line)
            i += 1
            continue
            
        # Start of course line
        if re.match(r'^[DFEG]\s+\d{7}', line):
            if i + 1 < len(lines):
                next_line = lines[i+1].strip()
                # Check if next line is a continuation (not a new course, not a header)
                if not re.match(r'^[DFEG]\s+\d{7}', next_line) and \
                   "AÑO" not in next_line and "SEMESTRE" not in next_line and next_line:
                    line += " " + next_line
                    i += 1
            processed_lines.append(line)
        i += 1

    for line in processed_lines:
        line = line.strip()
        if "AÑO" in line:
            current_year = line
            continue
        if "SEMESTRE" in line:
            current_sem = line
            continue
            
        # Regex to parse course line
        # Note: 2017 and 2025 formats are slightly different in whitespace/columns but similar structure.
        # 2025: F 2501102 INTRO... FS 5 ...
        # 2017: F 1701101 CALCULO... MS 5 ...
        
        # We need to capture Code, Name, Credits, Prereqs (which are codes at the end)
        
        # Name can be long. Dept is 2 chars uppercase (e.g. MS, FS, QU, GG).
        # Sometimes Dept has 2 codes (ED FL).
        
        match = re.match(r'^(?P<comp>[DFEG])\s+(?P<code>\d{7})\s+(?P<name>.+?)\s+(?P<dept>[A-Z]{2}(?:\s+[A-Z]{2})*)\s+(?P<cred>\d+)\s+(?P<rest>.*)$', line)
        
        if match:
            data = match.groupdict()
            rest = data['rest']
            # Extract prereqs (7 digit codes)
            prereqs = re.findall(r'\d{7}', rest)
            
            courses.append({
                'id': data['code'],
                'name': data['name'],
                'credits': int(data['cred']),
                'prereqs': prereqs,
                'year': current_year,
                'semester': current_sem
            })
            
    return courses

plan2017 = parse_curriculum('curriculum_2017.txt')
plan2025 = parse_curriculum('curriculum_2025.txt')

output = {
    '2017': plan2017,
    '2025': plan2025
}

print("const curriculumData = " + json.dumps(output, indent=2) + ";")
