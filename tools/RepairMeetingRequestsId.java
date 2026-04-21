import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class RepairMeetingRequestsId {
    public static void main(String[] args) throws Exception {
        try (Connection connection = DriverManager.getConnection(
                "jdbc:mysql://localhost:3306/kidtrack",
                "root",
                "root"
        );
             Statement statement = connection.createStatement()) {
            statement.execute("SET @kidtrack_meeting_request_id := 0");
            statement.execute("""
                    UPDATE meeting_requests
                    SET id = (@kidtrack_meeting_request_id := @kidtrack_meeting_request_id + 1)
                    ORDER BY created_at, requested_at
                    """);
            statement.execute("ALTER TABLE meeting_requests MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
            System.out.println("meeting_requests.id is now AUTO_INCREMENT");
        }
    }
}
