begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

insert into auth.users(id,email) values
('00000000-0000-4000-8000-000000031000','m4-admin@test.invalid'),
('00000000-0000-4000-8000-000000032000','m4-coordinator@test.invalid'),
('00000000-0000-4000-8000-000000033000','m4-judge@test.invalid'),
('00000000-0000-4000-8000-000000034000','m4-verifier@test.invalid'),
('00000000-0000-4000-8000-000000035000','m4-representative@test.invalid'),
('00000000-0000-4000-8000-000000036000','m4-committee@test.invalid'),
('00000000-0000-4000-8000-000000037000','m4-viewer@test.invalid');
insert into public.profiles(id,display_name) values
('00000000-0000-4000-8000-000000031000','M4 administrator'),('00000000-0000-4000-8000-000000032000','M4 coordinator'),
('00000000-0000-4000-8000-000000033000','M4 judge'),('00000000-0000-4000-8000-000000034000','M4 verifier'),
('00000000-0000-4000-8000-000000035000','M4 representative'),('00000000-0000-4000-8000-000000036000','M4 committee'),
('00000000-0000-4000-8000-000000037000','M4 viewer');
insert into public.houses(id,code,name) values('13000000-0000-4000-8000-000000000001','M4A','Milestone Four House A');
insert into public.sports_meets(id,name,year,starts_on,ends_on,status,registration_opens_at,registration_closes_at,published_at) values(
'23000000-0000-4000-8000-000000000001','Milestone Four Integrity Meet',extract(year from current_date+interval '10 days')::integer,current_date+10,current_date+12,'in_progress',now()-interval '5 days',now()-interval '1 day',now());
insert into public.meet_houses(sports_meet_id,house_id,added_by) values('23000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000031000');
insert into public.sport_categories(id,sports_meet_id,code,name,created_by) values('34000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','TRACK','Track','00000000-0000-4000-8000-000000031000');
insert into public.events(id,sports_meet_id,sport_category_id,code,name,event_type,format_code,status,roster_status,roster_locked_at,registration_status,starts_at,ends_at,protest_deadline_at) values(
'35000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','34000000-0000-4000-8000-000000000001','M4-100','M4 100 metres','individual','race','in_progress','open',null,'closed',(current_date+10)+time '10:00',(current_date+10)+time '11:00',now()+interval '2 days');
insert into public.user_roles(user_id,role,house_id,event_id,granted_by) values
('00000000-0000-4000-8000-000000031000','system_administrator',null,null,'00000000-0000-4000-8000-000000031000'),
('00000000-0000-4000-8000-000000032000','sports_coordinator',null,null,'00000000-0000-4000-8000-000000031000'),
('00000000-0000-4000-8000-000000033000','event_judge',null,'35000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000031000'),
('00000000-0000-4000-8000-000000033000','results_verifier',null,null,'00000000-0000-4000-8000-000000031000'),
('00000000-0000-4000-8000-000000034000','results_verifier',null,null,'00000000-0000-4000-8000-000000031000'),
('00000000-0000-4000-8000-000000035000','house_representative','13000000-0000-4000-8000-000000000001',null,'00000000-0000-4000-8000-000000031000'),
('00000000-0000-4000-8000-000000036000','protest_committee',null,null,'00000000-0000-4000-8000-000000031000'),
('00000000-0000-4000-8000-000000037000','public_viewer',null,null,'00000000-0000-4000-8000-000000031000');
insert into public.students(id,student_number,house_id,legal_first_name,legal_last_name,enrollment_status,eligibility_status,eligibility_verified_by,eligibility_verified_at) values(
'43000000-0000-4000-8000-000000000001','M4-A-001','13000000-0000-4000-8000-000000000001','Result','Athlete','enrolled','eligible','00000000-0000-4000-8000-000000034000',now()),
('43000000-0000-4000-8000-000000000002','M4-A-002','13000000-0000-4000-8000-000000000001','Second','Athlete','enrolled','eligible','00000000-0000-4000-8000-000000034000',now());
insert into public.event_registrations(id,event_id,student_id,house_id,entry_type,status,registered_by,reviewed_by,reviewed_at,approved_at,checked_in_by,checked_in_at) values(
'53000000-0000-4000-8000-000000000001','35000000-0000-4000-8000-000000000001','43000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','individual','checked_in','00000000-0000-4000-8000-000000035000','00000000-0000-4000-8000-000000034000',now(),now(),'00000000-0000-4000-8000-000000034000',now()),
('53000000-0000-4000-8000-000000000002','35000000-0000-4000-8000-000000000001','43000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000001','individual','checked_in','00000000-0000-4000-8000-000000035000','00000000-0000-4000-8000-000000034000',now(),now(),'00000000-0000-4000-8000-000000034000',now());
update public.events set roster_status='locked',roster_locked_at=now() where id='35000000-0000-4000-8000-000000000001';
insert into public.scoring_rules(id,sports_meet_id,name,version,definition,status,tie_policy,created_by) values(
'63000000-0000-4000-8000-000000000001','23000000-0000-4000-8000-000000000001','Official test-only policy',1,'{"source":"transactional-test-only"}','pending_approval','equal_points','00000000-0000-4000-8000-000000031000');
insert into public.scoring_rule_positions(scoring_rule_id,placement,points) values('63000000-0000-4000-8000-000000000001',1,3);
insert into public.protest_ground_categories(sports_meet_id,code,name,created_by) values(
'23000000-0000-4000-8000-000000000001','TIMING','Timing or measurement','00000000-0000-4000-8000-000000031000');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000037000',true);
select results_eq($$select count(*) from public.results$$,array[0::bigint],'public viewer sees no unpublished result');
select throws_ok($$insert into public.results(event_id,entry_type,registration_id,house_id,result_data,placement,submitted_by) values('35000000-0000-4000-8000-000000000001','individual','53000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','{}',1,'00000000-0000-4000-8000-000000037000')$$,'direct result insertion is denied');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000033000',true);
select lives_ok($$select public.save_result('73000000-0000-4000-8000-000000000001','35000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000001',null,'ranked',1,10000,null,null,null,null,null,true)$$,'assigned judge can submit a checked-in result');
select throws_ok($$select public.save_result(null,'35000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000001',null,'ranked',1,10001,null,null,null,null,null,true)$$,'duplicate entrant result is rejected');
select throws_ok($$select public.save_result(null,'35000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000002',null,'ranked',1,10100,null,null,null,null,null,true)$$,'duplicate placement without one explicit shared tie group is rejected');
select throws_ok($$select public.save_result(null,'35000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000002',null,'disqualified',1,null,null,null,null,null,null,true)$$,'disqualification cannot carry a ranked placement');
select throws_ok($$select public.review_result('73000000-0000-4000-8000-000000000001','verified','Attempted self verification')$$,'submitting judge cannot verify their own result even with verifier role');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000034000',true);
select lives_ok($$select public.review_result('73000000-0000-4000-8000-000000000001','verified','Independent result verification')$$,'independent verifier can verify the submitted result');
select throws_ok($$select public.finalize_result('73000000-0000-4000-8000-000000000001',false,'Unauthorized final approval')$$,'verifier cannot perform coordinator final approval');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000032000',true);
select lives_ok($$select public.finalize_result('73000000-0000-4000-8000-000000000001',false,'Independent coordinator approval')$$,'independent coordinator approves a verified result');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000031000',true);
select throws_ok($$select public.activate_scoring_rule('63000000-0000-4000-8000-000000000001')$$,'scoring-rule creator cannot approve their own version');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000032000',true);
select lives_ok($$select public.activate_scoring_rule('63000000-0000-4000-8000-000000000001')$$,'independent manager can activate a populated scoring version');
select lives_ok($$select public.assign_event_scoring_rule('35000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000001','Authorized official policy assignment')$$,'active scoring version can be assigned with a reason');
select lives_ok($$select public.score_result('73000000-0000-4000-8000-000000000001','Initial official calculation')$$,'approved result generates a traceable point award');
select results_eq($$select count(*) from public.point_awards where result_id='73000000-0000-4000-8000-000000000001' and voided_at is null$$,array[1::bigint],'exactly one active award exists');
select lives_ok($$select public.score_result('73000000-0000-4000-8000-000000000001','Authorized recalculation')$$,'authorized recalculation succeeds without double counting');
select results_eq($$select concat(count(*) filter(where voided_at is null),',',count(*) filter(where voided_at is not null)) from public.point_awards where result_id='73000000-0000-4000-8000-000000000001'$$,array['1,1'],'recalculation leaves one active and one voided award');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000034000',true);
select lives_ok($$select public.request_result_correction('73000000-0000-4000-8000-000000000001','ranked',1,9999,null,null,null,null,'Timing equipment correction')$$,'authorized reviewer can request a reasoned result correction');
select throws_ok($$select public.decide_result_correction((select id from public.result_correction_requests where result_id='73000000-0000-4000-8000-000000000001'),true,'Self-approved correction')$$,'correction requester cannot approve the correction');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000032000',true);
select lives_ok($$select public.decide_result_correction((select id from public.result_correction_requests where result_id='73000000-0000-4000-8000-000000000001'),true,'Independent equipment evidence review')$$,'independent coordinator can approve a correction');
select results_eq($$select status from public.results where id='73000000-0000-4000-8000-000000000001'$$,array['submitted'],'corrected result returns to independent verification');
select results_eq($$select count(*) from public.point_awards where result_id='73000000-0000-4000-8000-000000000001' and voided_at is null$$,array[0::bigint],'correction voids prior active awards');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000034000',true);
select lives_ok($$select public.review_result('73000000-0000-4000-8000-000000000001','verified','Corrected value independently verified')$$,'corrected result is reverified');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000032000',true);
select lives_ok($$select public.finalize_result('73000000-0000-4000-8000-000000000001',false,'Corrected result approved')$$,'corrected result is reapproved');
select lives_ok($$select public.score_result('73000000-0000-4000-8000-000000000001','Corrected official calculation')$$,'corrected approved revision is rescored');
select lives_ok($$select public.finalize_result('73000000-0000-4000-8000-000000000001',true,'Authorized public publication')$$,'approved result is intentionally published');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000035000',true);
select throws_ok($$select public.file_protest('73000000-0000-4000-8000-000000000001','UNAPPROVED','Unapproved category challenge')$$,'unconfigured protest ground is rejected');
select lives_ok($$select public.file_protest('73000000-0000-4000-8000-000000000001','timing','Documented timing challenge')$$,'house representative can file within the configured window');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000031000',true);
select throws_ok($$select public.assign_protest_reviewer((select id from public.protests where result_id='73000000-0000-4000-8000-000000000001'),'00000000-0000-4000-8000-000000035000')$$,'protest filer cannot be assigned to review their own case');
select lives_ok($$select public.assign_protest_reviewer((select id from public.protests where result_id='73000000-0000-4000-8000-000000000001'),'00000000-0000-4000-8000-000000036000')$$,'independent committee reviewer can be assigned');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000036000',true);
select lives_ok($$select public.decide_protest((select id from public.protests where result_id='73000000-0000-4000-8000-000000000001'),false,'Timing evidence supports recorded value','Protest dismissed after independent review')$$,'assigned conflict-free reviewer can decide the protest');
select results_eq($$select status from public.results where id='73000000-0000-4000-8000-000000000001'$$,array['published'],'dismissed protest restores the prior publication state');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000031000',true);
select results_eq($$select count(*)>0 from public.audit_logs where table_name in ('results','protests','point_awards')$$,array[true],'result, scoring and protest activity is audited');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000037000',true);
select throws_ok($$select public.set_standings_status('23000000-0000-4000-8000-000000000001','confirmed','Unauthorized declaration')$$,'public viewer cannot declare standings');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000032000',true);
select lives_ok($$select public.set_standings_status('23000000-0000-4000-8000-000000000001','confirmed','Authorized post-publication review')$$,'coordinator can explicitly confirm provisional standings');
select results_eq($$select standings_status from public.sports_meets where id='23000000-0000-4000-8000-000000000001'$$,array['confirmed'],'standings declaration state is stored');

set local role anon;
select results_eq($$select count(*) from public.results where id='73000000-0000-4000-8000-000000000001'$$,array[1::bigint],'anonymous public can read only the intentionally published result');
select results_eq($$select count(*) from public.point_awards where result_id='73000000-0000-4000-8000-000000000001'$$,array[1::bigint],'public sees only the current award backed by the published result');

select * from finish();
rollback;
