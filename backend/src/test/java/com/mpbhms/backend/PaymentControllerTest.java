import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpbhms.backend.controller.PaymentController;
import com.mpbhms.backend.entity.Bill;
import com.mpbhms.backend.entity.Contract;
import com.mpbhms.backend.entity.Room;
import com.mpbhms.backend.repository.BillRepository;
import com.mpbhms.backend.service.VnPayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@ExtendWith(MockitoExtension.class)
public class PaymentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private VnPayService vnPayService;

    @Mock
    private BillRepository billRepository;

    @InjectMocks
    private PaymentController paymentController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(paymentController).build();
    }

    @Test
    void testDebugBillStatus() throws Exception {
        Bill bill = new Bill();
        bill.setId(1L);
        bill.setTotalAmount(BigDecimal.valueOf(1500000));
        bill.setStatus(true);
        bill.setPaidDate(Instant.now());
        bill.setFromDate(Instant.now().minusSeconds(3600));
        bill.setToDate(Instant.now().plusSeconds(3600));

        Room room = new Room();
        room.setId(101L);
        bill.setRoom(room);

        Contract contract = new Contract();
        contract.setId(202L);
        bill.setContract(contract);

        when(billRepository.findById(anyLong())).thenReturn(Optional.of(bill));

        mockMvc.perform(get("/mpbhms/payment/debug/bill/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.billId").value(1))
                .andExpect(jsonPath("$.totalAmount").value(1500000))
                .andExpect(jsonPath("$.status").value(true))
                .andExpect(jsonPath("$.roomId").value(101))
                .andExpect(jsonPath("$.contractId").value(202));
    }

    @Test
    void testCreateVnPayUrl() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("billId", 1L);
        payload.put("amount", 100000L);
        payload.put("orderInfo", "Test Order");

        when(vnPayService.createPaymentUrl(1L, 100000L, "Test Order")).thenReturn("http://vnpay.test/url");

        mockMvc.perform(post("/mpbhms/payment/create-vnpay-url")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentUrl").value("http://vnpay.test/url"));
    }



    @Test
    void testDebugUpdateBillStatus() throws Exception {
        Bill bill = new Bill();
        bill.setId(1L);
        bill.setStatus(false);
        bill.setPaidDate(null);

        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));
        when(billRepository.save(any(Bill.class))).thenAnswer(i -> i.getArgument(0));

        mockMvc.perform(post("/mpbhms/payment/debug/update-bill-status/1?status=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.billId").value(1))
                .andExpect(jsonPath("$.status").value(true));
    }
}
