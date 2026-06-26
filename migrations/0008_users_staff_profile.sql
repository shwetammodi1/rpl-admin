-- Faculty profile enrichment: designation + degrees (from staff details).
ALTER TABLE users ADD COLUMN designation TEXT;
ALTER TABLE users ADD COLUMN degrees TEXT;

UPDATE users SET designation='Assistant Professor', degrees='MBA, MSW, M.Phil, LLB' WHERE biometric_ref='7';
UPDATE users SET designation='Assistant Professor', degrees='B.Com, B.P.Ed., M.P.Ed., Ph.D. (Pursuing)' WHERE biometric_ref='123';
UPDATE users SET designation='Assistant Professor', degrees='Ph.D., M.Phil, M.Com' WHERE biometric_ref='106';
UPDATE users SET designation='Assistant Professor', degrees='Ph.D.' WHERE biometric_ref='105';
UPDATE users SET designation='Assistant Professor', degrees='Ph.D., M.Com, B.Ed' WHERE biometric_ref='156';
UPDATE users SET designation='Associate Professor', degrees='M.Com, M.Phil, Ph.D.' WHERE biometric_ref='4';
UPDATE users SET designation='Assistant Professor', degrees='M.Com, Ph.D.' WHERE biometric_ref='102';
UPDATE users SET designation='Assistant Professor', degrees='Ph.D., MBA, B.Ed, M.Com' WHERE biometric_ref='107';
UPDATE users SET designation='Associate Professor', degrees='Ph.D., MBA, PGDCM, B.Sc' WHERE biometric_ref='149';
UPDATE users SET designation='Assistant Professor', degrees='B.Com, M.Com' WHERE biometric_ref='152';
UPDATE users SET designation='Assistant Professor', degrees='M.Com, M.Phil, M.Ed, PGDCA, Ph.D. (Pursuing)' WHERE biometric_ref='120';
UPDATE users SET designation='Assistant Professor', degrees='B.Com, MBA, MA' WHERE biometric_ref='117';
UPDATE users SET designation='Assistant Professor', degrees='B.A., M.A, B.Ed' WHERE biometric_ref='155';
UPDATE users SET designation='Assistant Professor', degrees='M.Phil, Ph.D. (Pursuing)' WHERE biometric_ref='111';
UPDATE users SET designation='Assistant Professor', degrees='B.Com, MBA, Ph.D. (Pursuing), UGC NET' WHERE biometric_ref='150';
UPDATE users SET designation='Office Assistant', degrees='B.Com (Computer Application), MBA' WHERE biometric_ref='5';
UPDATE users SET designation='Office Assistant', degrees='Higher Diploma in Software Engineering' WHERE biometric_ref='133';
UPDATE users SET designation='Office Assistant', degrees='M.A, B.Lib, PGDCA' WHERE biometric_ref='8';
UPDATE users SET designation='Office Assistant', degrees='Post Graduation' WHERE biometric_ref='130';
UPDATE users SET designation='Office Assistant (Asst. Librarian)', degrees='M.A, M.Lib I.Sc.' WHERE biometric_ref='128';
UPDATE users SET designation='Assistant Professor', degrees='B.Com, MBA, Ph.D. (Pursuing), UGC NET' WHERE name='Ankit bagdi';
