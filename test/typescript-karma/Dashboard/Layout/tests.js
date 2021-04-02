import Dashboard from  '/base/js/Dashboard/Dashboard.js';
const { test, only } = QUnit;

function setupContainer() {
    const container = document.createElement('div');
    container.id = 'test-container';

    //append the container container, which gets cleaned up after each test
    document.getElementById('container').appendChild(container);
    return container;
}

const rows = [{
    id: 'dashboard-row-0',
    cells: [{
        id: 'dashboard-col-0',
    }]
}, {
    id: 'dashboard-row-1',
    cells: [{
        id: 'dashboard-col-1'
    }]
}]

const layouts = [{
    id: 'layout-1', // mandatory
    rows
}]

const components = [{
    cell: 'dashboard-col-0',
    isResizable: true,
    type: 'chart',
    chartOptions: {
        type: 'pie',
        series: [{
            name: 'Series from options',
            data: [1, 2, 3, 4]
        }],
        chart: {
            animation: false
        }
    }
}, {
    cell: 'dashboard-col-1',
    type: 'html',
    elements: [{
        tagName: 'img',
        attributes: {
            src: 'https://i.ytimg.com/vi/qlO4M6MfDFY/hqdefault.jpg',
            title: 'I heard you like components'
        }
    }, {
        textContent: 'Loreum ipsum'
    }]
}]

test('Components in layout with no row style', function (assert) {
    const container = setupContainer();
    const dashboard = new Dashboard(container.id, {
        gui: {
            enabled: true,
            layouts
        },
        components
    });

    const comps = document.querySelectorAll('.highcharts-dashboard-component')
    for (const component of comps) {
        assert.strictEqual(component.style.height, '', 'Height should be unset')
        assert.strictEqual(component.style.width, '', 'Width should be unset')
    }


});

test('Components in rows with set height', function (assert) {
    const container = setupContainer();

    layouts[0].rows[0].style = {
        height: '200px',
        padding: '5px'
    }

    const dashboard = new Dashboard(container.id, {
        gui: {
            enabled: true,
            layouts
        },
        components
    });

    const columns = document.querySelectorAll('.highcharts-dashboard-cell')
    assert.strictEqual(columns.length, 2)
    for (const column of columns) {
        const components = column.querySelectorAll('.highcharts-dashboard-component')
        for (const component of components) {
            assert.strictEqual(component.style.height, column.style.height, 'Height should be set to the row')
            assert.strictEqual(component.style.width, '', 'Width should be unset')
        }
    }

    layouts[0].rows[0].style = {}
})

test('Components in layout with set width', function (assert) {
    const container = setupContainer();

    layouts[0].style = {
        width: '800px'
    }

    const dashboard = new Dashboard(container.id, {
        gui: {
            enabled: true,
            layouts
        },
        components
    });

    const columns = document.querySelectorAll('.highcharts-dashboard-cell')
    assert.strictEqual(columns.length, 2)
    for (const column of columns) {
        const components = column.querySelectorAll('.highcharts-dashboard-component');
        assert.strictEqual(column.style.width, '800px');
        for (const component of components) {
            assert.strictEqual(component.style.height, '', 'Height should be unset')
            assert.strictEqual(component.style.width, column.style.width, 'Width should be set to the column')
        }
    }

    layouts[0].style = {}
})

test('Components and rows in layout with set height', function (assert) {
    const container = setupContainer();

    layouts[0].style = {
        height: '800px'
    }

    const dashboard = new Dashboard(container.id, {
        gui: {
            enabled: true,
            layouts
        },
        components
    });

    const rows = document.querySelectorAll('.highcharts-dashboard-row')
    assert.strictEqual(rows.length, 2)

    // This is on the todo list :)
    // for (const row of rows) {
    //     assert.strictEqual(window.getComputedStyle(row).height, '400px')
    // }

    // const columns = document.querySelectorAll('.highcharts-dashboard-column')
    // assert.strictEqual(columns.length, 2)
    // for (const column of columns) {
    //     const components = column.querySelectorAll('.highcharts-dashboard-component');
    //     assert.strictEqual(column.style.width, '800px');
    //     for (const component of components) {
    //         assert.strictEqual(component.style.height, '', 'Height should be unset')
    //         assert.strictEqual(component.style.width, column.style.width, 'Width should be set to the column')
    //     }
    // }

    layouts[0].style = {}
})