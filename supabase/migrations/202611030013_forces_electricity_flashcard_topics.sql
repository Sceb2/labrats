-- Register the selectable Forces/Electricity topics; existing packs and history stay intact.
begin;
insert into public.flashcard_topics(subject_id,topic_id,label) values
('applied-science','FO01','Describing motion and speed'),
('applied-science','FO03','Displacement–time graphs'),
('applied-science','FO04','Velocity–time graphs and acceleration'),
('applied-science','FO06','Equations of motion'),
('applied-science','FO08','Measuring acceleration and accelerometers'),
('applied-science','FO09','Resultant forces and Newton’s first law'),
('applied-science','FO10','Mass, weight and inertia'),
('applied-science','FO11','Friction'),
('applied-science','FO12','Newton’s second law'),
('applied-science','FO13','Momentum'),
('applied-science','FO14','Impact forces and safety'),
('applied-science','FO16','Newton’s third law'),
('applied-science','FO17','Drag and terminal velocity'),
('applied-science','EL01','Circuit Components'),
('applied-science','EL11','Electrical Quantities'),
('applied-science','EL02','Potential Difference and Current'),
('applied-science','EL03','Resistance and Ohm''s Law'),
('applied-science','EL05','Thermistors'),
('applied-science','EL06','LEDs and LDRs'),
('applied-science','EL08','Electrical Energy'),
('applied-science','EL12','Changes of State'),
('applied-science','EL13','Specific Heat Capacity'),
('applied-science','EL15','Specific Latent Heat')
on conflict(subject_id,topic_id) do update set label=excluded.label;
commit;
