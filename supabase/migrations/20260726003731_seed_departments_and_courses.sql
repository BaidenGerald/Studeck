/*
# Seed reference data: departments and courses

1. Purpose
   Populate the departments and courses tables with realistic academic data so the
   platform is usable immediately after signup. All rows are upsert-safe.

2. Departments added (8)
   Computer Science (CS), Mathematics (MTH), Physics (PHY), Chemistry (CHM),
   Biology (BIO), Economics (ECO), Law (LAW), Medicine (MED).
   Each carries a lucide-react icon name used in the UI.

3. Courses added
   4-5 representative courses per department across levels (100-500), with codes
   and a semester hint (First/Second). Used to organize uploaded materials.

4. Security
   No policy changes. departments/courses remain public read, no client writes.
*/

-- ============ departments ============
INSERT INTO departments (name, code, description, icon) VALUES
  ('Computer Science', 'CS', 'Computing, software, algorithms and data systems.', 'Laptop'),
  ('Mathematics', 'MTH', 'Pure and applied mathematics, statistics and logic.', 'Sigma'),
  ('Physics', 'PHY', 'Mechanics, electromagnetism, quantum and modern physics.', 'Atom'),
  ('Chemistry', 'CHM', 'Organic, inorganic, physical and analytical chemistry.', 'FlaskConical'),
  ('Biology', 'BIO', 'Cell biology, genetics, ecology and physiology.', 'Dna'),
  ('Economics', 'ECO', 'Microeconomics, macroeconomics and econometrics.', 'TrendingUp'),
  ('Law', 'LAW', 'Constitutional, criminal, contract and commercial law.', 'Scale'),
  ('Medicine', 'MED', 'Human anatomy, physiology, pathology and pharmacology.', 'Stethoscope')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- ============ courses ============
-- Each VALUES row: (dept_code, course_code, title, level, semester).
-- Joined to departments to resolve the department_id. Course code is inserted
-- into courses.code; the ON CONFLICT (department_id, code) keeps it idempotent.

INSERT INTO courses (department_id, code, title, level, semester)
SELECT d.id, v.course_code, v.title, v.level, v.semester
FROM (VALUES
  ('CS', 'CS101', 'Introduction to Programming', '100', 'First'),
  ('CS', 'CS102', 'Data Structures and Algorithms', '200', 'First'),
  ('CS', 'CS201', 'Object Oriented Programming', '200', 'Second'),
  ('CS', 'CS301', 'Database Systems', '300', 'First'),
  ('CS', 'CS401', 'Operating Systems', '400', 'Second'),

  ('MTH', 'MTH101', 'Calculus I', '100', 'First'),
  ('MTH', 'MTH102', 'Linear Algebra', '200', 'First'),
  ('MTH', 'MTH201', 'Calculus II', '200', 'Second'),
  ('MTH', 'MTH301', 'Probability and Statistics', '300', 'First'),
  ('MTH', 'MTH401', 'Differential Equations', '400', 'Second'),

  ('PHY', 'PHY101', 'Classical Mechanics', '100', 'First'),
  ('PHY', 'PHY102', 'Electricity and Magnetism', '200', 'First'),
  ('PHY', 'PHY201', 'Thermodynamics', '200', 'Second'),
  ('PHY', 'PHY301', 'Quantum Mechanics', '300', 'Second'),
  ('PHY', 'PHY401', 'Modern Physics', '400', 'First'),

  ('CHM', 'CHM101', 'General Chemistry', '100', 'First'),
  ('CHM', 'CHM102', 'Organic Chemistry I', '200', 'First'),
  ('CHM', 'CHM201', 'Inorganic Chemistry', '200', 'Second'),
  ('CHM', 'CHM301', 'Physical Chemistry', '300', 'First'),
  ('CHM', 'CHM401', 'Analytical Chemistry', '400', 'Second'),

  ('BIO', 'BIO101', 'Cell Biology', '100', 'First'),
  ('BIO', 'BIO102', 'Genetics', '200', 'First'),
  ('BIO', 'BIO201', 'Microbiology', '200', 'Second'),
  ('BIO', 'BIO301', 'Ecology', '300', 'First'),
  ('BIO', 'BIO401', 'Human Physiology', '400', 'Second'),

  ('ECO', 'ECO101', 'Principles of Microeconomics', '100', 'First'),
  ('ECO', 'ECO102', 'Principles of Macroeconomics', '100', 'Second'),
  ('ECO', 'ECO201', 'Intermediate Microeconomics', '200', 'First'),
  ('ECO', 'ECO301', 'Econometrics', '300', 'First'),
  ('ECO', 'ECO401', 'Development Economics', '400', 'Second'),

  ('LAW', 'LAW101', 'Constitutional Law', '100', 'First'),
  ('LAW', 'LAW102', 'Criminal Law', '200', 'First'),
  ('LAW', 'LAW201', 'Contract Law', '200', 'Second'),
  ('LAW', 'LAW301', 'Commercial Law', '300', 'First'),
  ('LAW', 'LAW401', 'International Law', '400', 'Second'),

  ('MED', 'MED101', 'Human Anatomy', '100', 'First'),
  ('MED', 'MED102', 'Physiology', '200', 'First'),
  ('MED', 'MED201', 'Pathology', '300', 'First'),
  ('MED', 'MED301', 'Pharmacology', '300', 'Second'),
  ('MED', 'MED401', 'Internal Medicine', '400', 'Second')
) AS v(dept_code, course_code, title, level, semester)
JOIN departments d ON d.code = v.dept_code
ON CONFLICT (department_id, code) DO UPDATE SET
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  semester = EXCLUDED.semester;
