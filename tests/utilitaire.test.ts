import { dateDiff } from '../src/model/Utilitaire';

test('Date diff', () => {
	let date1 = new Date('2020-01-02');
	let date2 = new Date('2020-01-01');
	expect(dateDiff(date1, date2)).toEqual({
		day: 1,
		hour: 0,
		min: 0,
		sec: 0,
	});
	date1 = new Date('2020-01-01');
	date2 = new Date('2020-01-01');
	expect(dateDiff(date1, date2)).toEqual({
		day: 0,
		hour: 0,
		min: 0,
		sec: 0,
	});
});
